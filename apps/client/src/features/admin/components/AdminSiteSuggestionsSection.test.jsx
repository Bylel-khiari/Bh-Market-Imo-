import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AdminSiteSuggestionsSection from './AdminSiteSuggestionsSection';

const baseProps = {
  suggestionStatusFilterOptions: [{ value: 'pending', label: 'En attente' }],
  siteSuggestionTotals: { pending: 1 },
  siteSuggestionStatusFilter: 'pending',
  setSiteSuggestionStatusFilter: jest.fn(),
  siteSuggestionLoading: false,
  siteSuggestionError: '',
  siteSuggestionMessage: '',
  siteSuggestionSubmittingId: null,
  siteDiscoverySubmitting: false,
  handleStartSiteDiscovery: jest.fn(),
  handleAcceptSiteSuggestion: jest.fn(),
  handleUpdateSiteSuggestionStatus: jest.fn(),
  formatSiteSuggestionStatus: (status) => status,
  formatEvidenceList: () => 'immobilier, Tunisie',
  formatDate: () => '03/05/2026',
};

describe('AdminSiteSuggestionsSection', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders pending site suggestions with review actions', () => {
    act(() => {
      root.render(
        <AdminSiteSuggestionsSection
          {...baseProps}
          siteSuggestions={[
            {
              id: 1,
              name: 'Immo Test',
              domain: 'immo-test.tn',
              status: 'pending',
              base_url: 'https://immo-test.tn',
              sample_url: 'https://immo-test.tn/annonce/1',
              confidence_score: 82,
              discovered_at: '2026-05-03T00:00:00.000Z',
              evidence: {},
            },
          ]}
        />,
      );
    });

    expect(container.textContent).toContain('Immo Test');
    expect(container.textContent).toContain('82%');
    expect(container.textContent).toContain('Accepter');
    expect(container.textContent).toContain('Rejeter');
  });
});
