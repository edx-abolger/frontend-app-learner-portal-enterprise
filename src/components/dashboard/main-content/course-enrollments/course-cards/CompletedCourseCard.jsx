import React from 'react';
import PropTypes from 'prop-types';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform/config';

import BaseCourseCard from './BaseCourseCard';
import ContinueLearningButton from './ContinueLearningButton';

import { isCourseEnded } from '../../../../../utils/common';
import CertificateImgOld from './images/edx-verified-mini-cert.png';
import CertificateImg from './images/edx-verified-mini-cert-v2.png';

const CompletedCourseCard = (props) => {
  const user = getAuthenticatedUser();
  const { username } = user;
  const {
    title,
    linkToCourse,
    courseRunId,
    endDate,
  } = props;
  const config = getConfig();

  const renderButtons = () => {
    if (isCourseEnded(endDate)) {
      return null;
    }

    return (
      <ContinueLearningButton
        linkToCourse={linkToCourse}
        title={title}
        courseRunId={courseRunId}
      />
    );
  };

  // TODO: remove this function on/after December 15th, 2020 to only return
  // the ``CertificateImg``, which has the new logo. until then, this function
  // will show the image with the current logo and automatically switch to the
  // image with the new edX logo on December 15th.
  const getVerifiedCertificateImg = () => {
    const now = new Date();
    if (now < new Date('2020-12-15')) {
      return CertificateImgOld;
    }
    return CertificateImg;
  };

  const renderCertificateInfo = () => (
    props.linkToCertificate ? (
      <div className="d-flex mb-3">
        <div className="mr-3">
          <img src={getVerifiedCertificateImg()} alt="verified certificate preview" />
        </div>
        <div className="d-flex align-items-center">
          <p className="mb-0">
            View your certificate on{' '}
            <a href={`${config.LMS_BASE_URL}/u/${username}`}>
              your profile →
            </a>
          </p>
        </div>
      </div>
    ) : (
      <p className="mb-3">
        To earn a certificate,{' '}
        <a href={props.linkToCourse}>
          retake this course →
        </a>
      </p>
    )
  );

  return (
    <BaseCourseCard
      buttons={renderButtons()}
      type="completed"
      hasViewCertificateLink={false}
      {...props}
    >
      {renderCertificateInfo()}
    </BaseCourseCard>
  );
};

CompletedCourseCard.propTypes = {
  linkToCourse: PropTypes.string.isRequired,
  courseRunId: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  linkToCertificate: PropTypes.string,
  courseRunStatus: PropTypes.string.isRequired,
  endDate: PropTypes.string,
};

CompletedCourseCard.defaultProps = {
  linkToCertificate: null,
  endDate: null,
};

export default CompletedCourseCard;
