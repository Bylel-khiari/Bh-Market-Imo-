import { useEffect, useMemo, useState } from 'react';

export default function useAdminPropertiesPagination({
  limit,
  total,
  totalPages,
  search,
  status,
}) {
  const [currentPropertyPage, setCurrentPropertyPage] = useState(1);
  const normalizedTotalPages = Math.max(1, Number(totalPages || 1));
  const normalizedLimit = Math.max(1, Number(limit || 1));
  const normalizedTotal = Math.max(0, Number(total || 0));

  useEffect(() => {
    setCurrentPropertyPage(1);
  }, [search, status]);

  useEffect(() => {
    if (currentPropertyPage > normalizedTotalPages) {
      setCurrentPropertyPage(normalizedTotalPages);
    }
  }, [currentPropertyPage, normalizedTotalPages]);

  const propertyVisiblePageNumbers = useMemo(() => {
    const maxVisiblePages = 5;

    if (normalizedTotalPages <= maxVisiblePages) {
      return Array.from({ length: normalizedTotalPages }, (_, index) => index + 1);
    }

    const halfWindow = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, currentPropertyPage - halfWindow);
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > normalizedTotalPages) {
      endPage = normalizedTotalPages;
      startPage = endPage - maxVisiblePages + 1;
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
  }, [currentPropertyPage, normalizedTotalPages]);

  const propertyVisibleRangeStart =
    normalizedTotal === 0 ? 0 : (currentPropertyPage - 1) * normalizedLimit + 1;
  const propertyVisibleRangeEnd = Math.min(currentPropertyPage * normalizedLimit, normalizedTotal);

  return {
    currentPropertyPage,
    setCurrentPropertyPage,
    propertyTotalPages: normalizedTotalPages,
    propertyVisiblePageNumbers,
    propertyVisibleRangeStart,
    propertyVisibleRangeEnd,
  };
}
