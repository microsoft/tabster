/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import React from 'react';
import EnhancedSearch from 'enhancedocs-search';

import 'enhancedocs-search/dist/style.css';

const SearchBarWrapper = (props) => {
  return (
    <EnhancedSearch
      config={{
        enhancedSearch: {
          projectId: '<replace_with_project_id>',
          accessToken: '<replace_with_access_token>'
        }
      }}
      theme={{
        primaryColor: '#25c2a0'
      }}
      {...props}
    />
  );
};

export default SearchBarWrapper;
