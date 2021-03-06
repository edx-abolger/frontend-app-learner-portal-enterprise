import qs from 'query-string';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { camelCaseObject } from '@edx/frontend-platform/utils';
import { getConfig } from '@edx/frontend-platform/config';

import { hasValidStartExpirationDates } from '../../../utils/common';
import { LICENSE_SUBSIDY_TYPE, PROMISE_FULFILLED } from './constants';
import { getActiveCourseRun, getAvailableCourseRuns } from './utils';

export default class CourseService {
  constructor(options = {}) {
    const {
      activeCourseRun,
      courseKey,
      courseRunKey,
      enterpriseUuid,
    } = options;
    this.config = getConfig();

    this.authenticatedHttpClient = getAuthenticatedHttpClient();
    this.cachedAuthenticatedHttpClient = getAuthenticatedHttpClient({
      useCache: this.config.USE_API_CACHE,
    });

    this.courseKey = courseKey;
    this.courseRunKey = courseRunKey;
    this.enterpriseUuid = enterpriseUuid;
    this.activeCourseRun = activeCourseRun;
  }

  async fetchAllCourseData() {
    const data = await Promise.all([
      this.fetchCourseDetails(),
      this.fetchUserEnrollments(),
      this.fetchUserEntitlements(),
      this.fetchEnterpriseCustomerContainsContent(),
    ])
      .then((responses) => responses.map(response => response.data));

    const courseDetails = camelCaseObject(data[0]);
    // Get the user subsidy (by license, codes, or any other means) that the user may have for the active course run
    this.activeCourseRun = this.activeCourseRun || getActiveCourseRun(courseDetails);
    const userSubsidy = await this.fetchEnterpriseUserSubsidy();
    // Check for the course_run_key URL param and remove all other course run data
    // if the given course run key is for an available course run.
    if (this.courseRunKey) {
      const availableCourseRuns = getAvailableCourseRuns(courseDetails);
      const availableCourseRunKeys = availableCourseRuns.map(({ key }) => key);
      if (availableCourseRunKeys.includes(this.courseRunKey)) {
        courseDetails.canonicalCourseRunKey = this.courseRunKey;
        courseDetails.courseRunKeys = [this.courseRunKey];
        courseDetails.courseRuns = availableCourseRuns.filter(obj => obj.key === this.courseRunKey);
        courseDetails.advertisedCourseRunUuid = courseDetails.courseRuns[0].uuid;
      }
    }

    return {
      courseDetails,
      userSubsidy,
      userEnrollments: data[1],
      userEntitlements: data[2].results,
      catalog: data[3],
    };
  }

  fetchCourseDetails() {
    const url = `${this.config.DISCOVERY_API_BASE_URL}/api/v1/courses/${this.courseKey}/`;
    return this.cachedAuthenticatedHttpClient.get(url);
  }

  fetchUserEnrollments() {
    // NOTE: this request url cannot use a trailing slash since it causes a 404
    const url = `${this.config.LMS_BASE_URL}/api/enrollment/v1/enrollment`;
    return this.authenticatedHttpClient.get(url);
  }

  fetchUserEntitlements() {
    const url = `${this.config.LMS_BASE_URL}/api/entitlements/v1/entitlements/`;
    return this.authenticatedHttpClient.get(url);
  }

  fetchEnterpriseCustomerContainsContent() {
    const options = { course_run_ids: this.courseKey, get_catalog_list: true };
    const url = `${this.config.ENTERPRISE_CATALOG_API_BASE_URL}/api/v1/enterprise-customer/${this.enterpriseUuid}/contains_content_items/?${qs.stringify(options)}`;
    return this.cachedAuthenticatedHttpClient.get(url);
  }

  async fetchEnterpriseUserSubsidy() {
    // TODO: this will likely be expanded to support codes/offers, by appending to
    // the below array to provide a function that makes the relevant API call(s)
    // for the specified subsidy type.
    //
    // note: these API calls should be ordered by priority. Example: if a user has
    // a license subsidy, we use that as the user's final subsidy. if not, we check
    // if the user has a code subsidy, and so on.
    const SUBSIDY_TYPES = [{
      type: LICENSE_SUBSIDY_TYPE,
      fetchFn: this.fetchUserLicenseSubsidy(),
    }];
    const promises = SUBSIDY_TYPES.map(subsidy => subsidy.fetchFn);
    // Promise.allSettled() waits until all promises are resolved, whether successful
    // or not. in contrast, Promise.all() immediately rejects when any promise errors
    // which is not ideal since if a user doesn't have a subsidy, the APIs may return
    // a non-200 status code.
    const data = await Promise.allSettled(promises);

    let userSubsidy = null;
    for (let i = 0; i < data.length; i++) {
      if (data[i]?.status === PROMISE_FULFILLED) {
        const result = data[i].value.data;
        const subsidyData = camelCaseObject(result);

        if (hasValidStartExpirationDates(subsidyData)) {
          userSubsidy = { ...subsidyData, subsidyType: SUBSIDY_TYPES[i].type };
          // if a non-expired user subsidy is found, break early since the promises
          // are priority ordered
          break;
        }
      }
    }

    return userSubsidy;
  }

  fetchUserLicenseSubsidy() {
    const options = {
      enterprise_customer_uuid: this.enterpriseUuid,
      course_key: this.activeCourseRun.key,
    };
    const url = `${this.config.LICENSE_MANAGER_URL}/api/v1/license-subsidy/?${qs.stringify(options)}`;
    return this.cachedAuthenticatedHttpClient.get(url);
  }
}
