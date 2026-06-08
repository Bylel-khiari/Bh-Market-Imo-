import useAdminScrapeSites from './useAdminScrapeSites';
import useAdminScraperControl from './useAdminScraperControl';
import useAdminSiteSuggestions from './useAdminSiteSuggestions';

export default function useAdminScraper({ activeSection, fetchDashboardSummary, handleAuthFailure }) {
  const scrapeSitesController = useAdminScrapeSites({
    fetchDashboardSummary,
    handleAuthFailure,
  });

  const scraperControlController = useAdminScraperControl({
    activeSection,
    handleAuthFailure,
  });

  const siteSuggestionsController = useAdminSiteSuggestions({
    fetchDashboardSummary,
    fetchScrapeSites: scrapeSitesController.fetchScrapeSites,
    handleAuthFailure,
  });

  return {
    ...scrapeSitesController,
    ...scraperControlController,
    ...siteSuggestionsController,
  };
}
