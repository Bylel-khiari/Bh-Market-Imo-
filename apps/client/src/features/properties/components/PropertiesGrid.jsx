import React from 'react';
import PropertyCard from './PropertyCard';
import PropertiesPagination from './PropertiesPagination';

export default function PropertiesGrid({
  currentPage,
  favoriteIdSet,
  favoritePendingId,
  focusedId,
  onReportProperty,
  onSelectProperty,
  onToggleFavorite,
  paginatedProperties,
  selectedProperty,
  setCurrentPage,
  totalPages,
  visiblePageNumbers,
}) {
  return (
    <>
      <div className="properties-grid new-grid">
        {paginatedProperties.map((property) => {
          const propertyId = String(property.id);

          return (
            <PropertyCard
              key={property.id}
              property={property}
              active={String(selectedProperty?.id) === propertyId}
              focused={focusedId === propertyId}
              isFavorite={favoriteIdSet.has(propertyId)}
              isFavoritePending={favoritePendingId === propertyId}
              onSelect={() => onSelectProperty(property.id)}
              onToggleFavorite={(event) => onToggleFavorite(event, property)}
              onReport={(event) => onReportProperty(property, event)}
            />
          );
        })}
      </div>

      <PropertiesPagination
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        visiblePageNumbers={visiblePageNumbers}
      />
    </>
  );
}
