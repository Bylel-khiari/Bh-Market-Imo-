import useProperties from './hooks/useProperties';
import usePropertyCatalog from './hooks/usePropertyCatalog';
import usePropertyInteractions from './hooks/usePropertyInteractions';

export default function usePropertiesController() {
  const propertiesData = useProperties();
  const catalog = usePropertyCatalog({
    favoriteIds: propertiesData.favoriteIds,
    loading: propertiesData.loading,
    properties: propertiesData.properties,
  });
  const interactions = usePropertyInteractions({
    authSession: propertiesData.authSession,
    currentUserRole: propertiesData.currentUserRole,
    favoriteIdSet: catalog.favoriteIdSet,
    setFavoriteError: propertiesData.setFavoriteError,
    setFavoriteIds: propertiesData.setFavoriteIds,
    setFavoriteNotice: propertiesData.setFavoriteNotice,
  });

  return {
    catalog,
    interactions,
    propertiesData,
  };
}
