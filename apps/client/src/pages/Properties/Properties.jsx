import React from 'react';
import PropertiesFilters from './components/PropertiesFilters';
import PropertiesMapSection from './components/PropertiesMapSection';
import PropertiesReportModal from './components/PropertiesReportModal';
import PropertiesResultsPanel from './components/PropertiesResultsPanel';
import useProperties from './hooks/useProperties';
import usePropertyCatalog from './hooks/usePropertyCatalog';
import usePropertyInteractions from './hooks/usePropertyInteractions';
import '../../styles/Properties.css';

const Properties = () => {
  const {
    authSession,
    currentUserRole,
    error,
    favoriteError,
    favoriteIds,
    favoriteLoading,
    favoriteNotice,
    fetchProperties,
    loading,
    properties,
    setFavoriteError,
    setFavoriteIds,
    setFavoriteNotice,
  } = useProperties();

  const {
    activeFilterCount,
    clearPropertyFilters,
    currentPage,
    favoriteIdSet,
    favoritesOnly,
    filteredProperties,
    focusedId,
    hasImageOnly,
    maxPriceInput,
    minPriceInput,
    openSimulationForProperty,
    paginatedProperties,
    priceStats,
    propertyTypeOptions,
    searchKeywordValue,
    searchLocationValue,
    selectedProperty,
    selectedPropertyType,
    selectedSource,
    setCurrentPage,
    setSelectedPropertyId,
    sortOrder,
    sourceOptions,
    totalPages,
    updateFavoritesFilter,
    updatePropertyFilter,
    visiblePageNumbers,
    visibleRangeEnd,
    visibleRangeStart,
  } = usePropertyCatalog({
    favoriteIds,
    loading,
    properties,
  });

  const {
    closeReportModal,
    favoritePendingId,
    openReportModal,
    reportCategory,
    reportError,
    reportMessage,
    reportModalProperty,
    reportNotice,
    reportSubmitting,
    setReportCategory,
    setReportMessage,
    submitReport,
    toggleFavorite,
  } = usePropertyInteractions({
    authSession,
    currentUserRole,
    favoriteIdSet,
    setFavoriteError,
    setFavoriteIds,
    setFavoriteNotice,
  });

  return (
    <div className="properties-page marketplace-mode">
      <div className="marketplace-shell">
        <PropertiesFilters
          activeFilterCount={activeFilterCount}
          clearPropertyFilters={clearPropertyFilters}
          currentUserRole={currentUserRole}
          favoritesOnly={favoritesOnly}
          filteredCount={filteredProperties.length}
          hasImageOnly={hasImageOnly}
          maxPriceInput={maxPriceInput}
          minPriceInput={minPriceInput}
          priceStats={priceStats}
          propertyTypeOptions={propertyTypeOptions}
          searchKeywordValue={searchKeywordValue}
          searchLocationValue={searchLocationValue}
          selectedPropertyType={selectedPropertyType}
          selectedSource={selectedSource}
          sortOrder={sortOrder}
          sourceOptions={sourceOptions}
          updateFavoritesFilter={updateFavoritesFilter}
          updatePropertyFilter={updatePropertyFilter}
        />

        <PropertiesResultsPanel
          authSession={authSession}
          currentPage={currentPage}
          currentUserRole={currentUserRole}
          error={error}
          favoriteError={favoriteError}
          favoriteIdSet={favoriteIdSet}
          favoriteIds={favoriteIds}
          favoriteLoading={favoriteLoading}
          favoriteNotice={favoriteNotice}
          favoritePendingId={favoritePendingId}
          favoritesOnly={favoritesOnly}
          fetchProperties={fetchProperties}
          filteredProperties={filteredProperties}
          focusedId={focusedId}
          loading={loading}
          onReportProperty={openReportModal}
          onSelectProperty={setSelectedPropertyId}
          onToggleFavorite={toggleFavorite}
          paginatedProperties={paginatedProperties}
          reportError={reportError}
          reportNotice={reportNotice}
          selectedProperty={selectedProperty}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          visiblePageNumbers={visiblePageNumbers}
          visibleRangeEnd={visibleRangeEnd}
          visibleRangeStart={visibleRangeStart}
        />

        <PropertiesMapSection
          favoriteIdSet={favoriteIdSet}
          favoritePendingId={favoritePendingId}
          onOpenSimulation={openSimulationForProperty}
          onReportProperty={openReportModal}
          onToggleFavorite={toggleFavorite}
          selectedProperty={selectedProperty}
        />
      </div>

      <PropertiesReportModal
        closeReportModal={closeReportModal}
        reportCategory={reportCategory}
        reportError={reportError}
        reportMessage={reportMessage}
        reportModalProperty={reportModalProperty}
        reportSubmitting={reportSubmitting}
        setReportCategory={setReportCategory}
        setReportMessage={setReportMessage}
        submitReport={submitReport}
      />
    </div>
  );
};

export default Properties;
