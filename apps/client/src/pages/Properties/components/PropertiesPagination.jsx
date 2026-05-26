import React from 'react';

export default function PropertiesPagination({
  currentPage,
  setCurrentPage,
  totalPages,
  visiblePageNumbers,
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="properties-pagination" aria-label="Pagination des biens">
      <button
        type="button"
        className="pagination-btn pagination-btn--nav"
        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
        disabled={currentPage === 1}
      >
        PrÃ©cÃ©dent
      </button>

      <div className="pagination-pages">
        {visiblePageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={`pagination-btn ${pageNumber === currentPage ? 'is-active' : ''}`}
            onClick={() => setCurrentPage(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="pagination-btn pagination-btn--nav"
        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
        disabled={currentPage === totalPages}
      >
        Suivant
      </button>
    </nav>
  );
}
