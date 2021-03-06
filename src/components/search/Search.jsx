import React, { useContext } from 'react';
import { Helmet } from 'react-helmet';
import algoliasearch from 'algoliasearch/lite';
import { Configure, InstantSearch } from 'react-instantsearch-dom';
import { AppContext } from '@edx/frontend-platform/react';
import { getConfig } from '@edx/frontend-platform/config';

import {
  SearchHeader,
  useDefaultSearchFilters,
} from '@edx/frontend-enterprise';

import { NUM_RESULTS_PER_PAGE } from './constants';
import SearchResults from './SearchResults';

import { IntegrationWarningModal } from '../integration-warning-modal';
import { UserSubsidyContext } from '../enterprise-user-subsidy';

const Search = () => {
  const { enterpriseConfig, subscriptionPlan } = useContext(AppContext);
  const { offers: { offers } } = useContext(UserSubsidyContext);
  const offerCatalogs = offers.map((offer) => offer.catalog);
  const { filters } = useDefaultSearchFilters({
    enterpriseConfig,
    subscriptionPlan,
    offerCatalogs,
  });

  const config = getConfig();
  const searchClient = algoliasearch(
    config.ALGOLIA_APP_ID,
    config.ALGOLIA_SEARCH_API_KEY,
  );

  const PAGE_TITLE = `Search courses - ${enterpriseConfig.name}`;

  return (
    <>
      <Helmet title={PAGE_TITLE} />
      <InstantSearch
        indexName={config.ALGOLIA_INDEX_NAME}
        searchClient={searchClient}
      >
        <Configure hitsPerPage={NUM_RESULTS_PER_PAGE} filters={filters} />
        <SearchHeader />
        <SearchResults />
      </InstantSearch>
      <IntegrationWarningModal isOpen={enterpriseConfig.showIntegrationWarning} />
    </>
  );
};

export default Search;
