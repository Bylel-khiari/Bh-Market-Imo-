import React from 'react';
import PropertiesFilters from '../components/PropertiesFilters';
import PropertiesMapSection from '../components/PropertiesMapSection';
import PropertiesReportModal from '../components/PropertiesReportModal';
import PropertiesResultsPanel from '../components/PropertiesResultsPanel';

export default function PropertiesLayout({ catalog, interactions, propertiesData }) {
  return (
    <div className="properties-page marketplace-mode">
      <div className={`marketplace-shell ${catalog.favoritesOnly ? 'is-favorites-view' : ''}`}>
        {!catalog.favoritesOnly && (
          <PropertiesFilters
            activeFilterCount={catalog.activeFilterCount}
            clearPropertyFilters={catalog.clearPropertyFilters}
            currentUserRole={propertiesData.currentUserRole}
            favoritesOnly={catalog.favoritesOnly}
            filteredCount={catalog.filteredProperties.length}
            hasImageOnly={catalog.hasImageOnly}
            maxPriceInput={catalog.maxPriceInput}
            minPriceInput={catalog.minPriceInput}
            priceStats={catalog.priceStats}
            propertyTypeOptions={catalog.propertyTypeOptions}
            searchKeywordValue={catalog.searchKeywordValue}
            searchLocationValue={catalog.searchLocationValue}
            selectedPropertyType={catalog.selectedPropertyType}
            selectedSource={catalog.selectedSource}
            sortOrder={catalog.sortOrder}
            sourceOptions={catalog.sourceOptions}
            updateFavoritesFilter={catalog.updateFavoritesFilter}
            updatePropertyFilter={catalog.updatePropertyFilter}
          />
        )}

        <PropertiesResultsPanel
          authSession={propertiesData.authSession}
          currentPage={catalog.currentPage}
          currentUserRole={propertiesData.currentUserRole}
          error={propertiesData.error}
          favoriteError={propertiesData.favoriteError}
          favoriteIdSet={catalog.favoriteIdSet}
          favoriteIds={propertiesData.favoriteIds}
          favoriteLoading={propertiesData.favoriteLoading}
          favoriteNotice={propertiesData.favoriteNotice}
          favoritePendingId={interactions.favoritePendingId}
          favoritesOnly={catalog.favoritesOnly}
          fetchProperties={propertiesData.fetchProperties}
          filteredProperties={catalog.filteredProperties}
          focusedId={catalog.focusedId}
          loading={propertiesData.loading}
          onReportProperty={interactions.openReportModal}
          onSelectProperty={catalog.setSelectedPropertyId}
          onToggleFavorite={interactions.toggleFavorite}
          paginatedProperties={catalog.paginatedProperties}
          reportError={interactions.reportError}
          reportNotice={interactions.reportNotice}
          selectedProperty={catalog.selectedProperty}
          setCurrentPage={catalog.setCurrentPage}
          totalPages={catalog.totalPages}
          visiblePageNumbers={catalog.visiblePageNumbers}
          visibleRangeEnd={catalog.visibleRangeEnd}
          visibleRangeStart={catalog.visibleRangeStart}
        />

        <PropertiesMapSection
          favoriteIdSet={catalog.favoriteIdSet}
          favoritePendingId={interactions.favoritePendingId}
          onOpenSimulation={catalog.openSimulationForProperty}
          onReportProperty={interactions.openReportModal}
          onToggleFavorite={interactions.toggleFavorite}
          selectedProperty={catalog.selectedProperty}
        />
      </div>

      <PropertiesReportModal
        closeReportModal={interactions.closeReportModal}
        reportCategory={interactions.reportCategory}
        reportError={interactions.reportError}
        reportMessage={interactions.reportMessage}
        reportModalProperty={interactions.reportModalProperty}
        reportSubmitting={interactions.reportSubmitting}
        setReportCategory={interactions.setReportCategory}
        setReportMessage={interactions.setReportMessage}
        submitReport={interactions.submitReport}
      />
    </div>
  );
}
