import qs from 'query-string';
import React, { useContext, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import MediaQuery from 'react-responsive';
import { breakpoints } from '@edx/paragon';
import { AppContext } from '@edx/frontend-platform/react';
import { camelCaseObject } from '@edx/frontend-platform/utils';

import { MainContent, Sidebar } from '../layout';
import { LoadingSpinner } from '../loading-spinner';
import { CourseContextProvider } from './CourseContextProvider';
import CourseHeader from './CourseHeader';
import CourseMainContent from './CourseMainContent';
import CourseSidebar from './CourseSidebar';

import { useAllCourseData } from './data/hooks';
import { getActiveCourseRun, getAvailableCourseRuns } from './data/utils';
import NotFoundPage from '../NotFoundPage';

export default function Course() {
  const { courseKey } = useParams();
  const { enterpriseConfig } = useContext(AppContext);
  const location = useLocation();

  const courseRunKey = useMemo(
    () => {
      const queryParams = camelCaseObject(qs.parse(location.search));
      return queryParams.courseRunKey;
    },
    [location],
  );

  const [courseData, fetchError] = useAllCourseData({
    courseKey,
    enterpriseConfig,
    courseRunKey,
  });

  const initialState = useMemo(
    () => {
      if (courseData) {
        const {
          courseDetails, userEnrollments, userEntitlements, userSubsidy, catalog,
        } = courseData;
        return {
          course: courseDetails,
          activeCourseRun: getActiveCourseRun(courseDetails),
          availableCourseRuns: getAvailableCourseRuns(courseDetails),
          userEnrollments,
          userEntitlements,
          userSubsidy,
          catalog,
        };
      }
      return undefined;
    },
    [courseData],
  );

  if (fetchError) {
    return <NotFoundPage />;
  }

  if (!initialState) {
    return (
      <div className="container-fluid py-5">
        <LoadingSpinner screenReaderText="loading course" />
      </div>
    );
  }

  // If there isn't an active course run we don't show the course at all
  if (!initialState.activeCourseRun) {
    return <NotFoundPage />;
  }

  const PAGE_TITLE = `${initialState.course.title} - ${enterpriseConfig.name}`;

  return (
    <>
      <Helmet title={PAGE_TITLE} />
      <CourseContextProvider initialState={initialState}>
        <CourseHeader />
        <div className="container-fluid py-5">
          <div className="row">
            <MainContent>
              <CourseMainContent />
            </MainContent>
            <MediaQuery minWidth={breakpoints.large.minWidth}>
              {matches => matches && (
                <Sidebar>
                  <CourseSidebar />
                </Sidebar>
              )}
            </MediaQuery>
          </div>
        </div>
      </CourseContextProvider>
    </>
  );
}
