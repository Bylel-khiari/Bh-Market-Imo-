import React from 'react';
import AdminPropertyModal from '../properties/AdminPropertyModal';
import AdminSiteModal from '../scraper/AdminSiteModal';
import { AdminConfirmModal } from './AdminModalShell';
import AdminUserModal from '../users/AdminUserModal';

export default function AdminModals({
  activeSection,
  propertiesController,
  scraperController,
  usersController,
}) {
  const {
    closeDeleteConfirm,
    deleteCandidate,
    editingUserId,
    formData,
    formMessage,
    formMode,
    handleDeleteConfirmed,
    handleFormChange,
    handleGeneratePassword,
    handleSubmit,
    isEditPanelOpen,
    openCreatePanel,
    resetForm,
    submitting,
  } = usersController;

  const {
    closeDeletePropertyConfirm,
    editingPropertyId,
    handleDeletePropertyConfirmed,
    handlePropertyFormChange,
    handlePropertySubmit,
    isPropertyPanelOpen,
    openCreatePropertyPanel,
    propertyDeleteCandidate,
    propertyFormData,
    propertyFormMessage,
    propertyFormMode,
    propertySubmitting,
    resetPropertyForm,
  } = propertiesController;

  const {
    closeDeactivateSiteConfirm,
    closeDeleteSiteConfirm,
    editingSiteId,
    handleDeactivateSiteConfirmed,
    handleDeleteSiteConfirmed,
    handleSiteFormChange,
    handleSiteSubmit,
    isSitePanelOpen,
    openCreateSitePanel,
    resetSiteForm,
    setSiteDeactivateRelatedListings,
    setSiteDeleteRelatedListings,
    siteDeactivateCandidate,
    siteDeactivateRelatedListings,
    siteDeleteCandidate,
    siteDeleteRelatedListings,
    siteFormData,
    siteFormMessage,
    siteFormMode,
    siteSubmitting,
  } = scraperController;

  return (
    <>
      {activeSection === 'users' && isEditPanelOpen && (
        <AdminUserModal
          editingUserId={editingUserId}
          formData={formData}
          formMessage={formMessage}
          formMode={formMode}
          handleFormChange={handleFormChange}
          handleGeneratePassword={handleGeneratePassword}
          handleSubmit={handleSubmit}
          openCreatePanel={openCreatePanel}
          resetForm={resetForm}
          submitting={submitting}
        />
      )}

      {activeSection === 'users' && Boolean(deleteCandidate) && (
        <AdminConfirmModal
          disabled={submitting}
          confirmLabel={submitting ? 'Suppression...' : 'Oui, supprimer'}
          onCancel={closeDeleteConfirm}
          onConfirm={handleDeleteConfirmed}
        >
          Voulez-vous vraiment supprimer{' '}
          <strong>{deleteCandidate?.name || deleteCandidate?.email}</strong> ?
        </AdminConfirmModal>
      )}

      {activeSection === 'properties' && isPropertyPanelOpen && (
        <AdminPropertyModal
          editingPropertyId={editingPropertyId}
          handlePropertyFormChange={handlePropertyFormChange}
          handlePropertySubmit={handlePropertySubmit}
          openCreatePropertyPanel={openCreatePropertyPanel}
          propertyFormData={propertyFormData}
          propertyFormMessage={propertyFormMessage}
          propertyFormMode={propertyFormMode}
          propertySubmitting={propertySubmitting}
          resetPropertyForm={resetPropertyForm}
        />
      )}

      {activeSection === 'properties' && Boolean(propertyDeleteCandidate) && (
        <AdminConfirmModal
          disabled={propertySubmitting}
          confirmLabel={propertySubmitting ? 'Suppression...' : 'Oui, supprimer'}
          onCancel={closeDeletePropertyConfirm}
          onConfirm={handleDeletePropertyConfirmed}
        >
          Voulez-vous vraiment supprimer le bien{' '}
          <strong>{propertyDeleteCandidate?.title || `#${propertyDeleteCandidate?.id}`}</strong> ?
        </AdminConfirmModal>
      )}

      {activeSection === 'sites' && isSitePanelOpen && (
        <AdminSiteModal
          editingSiteId={editingSiteId}
          handleSiteFormChange={handleSiteFormChange}
          handleSiteSubmit={handleSiteSubmit}
          openCreateSitePanel={openCreateSitePanel}
          resetSiteForm={resetSiteForm}
          siteFormData={siteFormData}
          siteFormMessage={siteFormMessage}
          siteFormMode={siteFormMode}
          siteSubmitting={siteSubmitting}
        />
      )}

      {activeSection === 'sites' && Boolean(siteDeleteCandidate) && (
        <AdminConfirmModal
          disabled={siteSubmitting}
          confirmLabel={siteSubmitting ? 'Suppression...' : 'Oui, supprimer'}
          onCancel={closeDeleteSiteConfirm}
          onConfirm={handleDeleteSiteConfirmed}
        >
          <p>
            Voulez-vous vraiment supprimer le site <strong>{siteDeleteCandidate?.name}</strong> ?
          </p>
          <label className="admin-checkbox-row admin-confirm-choice">
            <input
              type="checkbox"
              checked={siteDeleteRelatedListings}
              onChange={(event) => setSiteDeleteRelatedListings(event.target.checked)}
              disabled={siteSubmitting}
            />
            <span>
              Supprimer aussi les annonces importees depuis le spider{' '}
              <strong>{siteDeleteCandidate?.spider_name}</strong>
            </span>
          </label>
        </AdminConfirmModal>
      )}

      {activeSection === 'sites' && Boolean(siteDeactivateCandidate) && (
        <AdminConfirmModal
          disabled={siteSubmitting}
          title="Confirmer la desactivation"
          confirmLabel={siteSubmitting ? 'Desactivation...' : 'Oui, desactiver'}
          onCancel={closeDeactivateSiteConfirm}
          onConfirm={handleDeactivateSiteConfirmed}
        >
          <p>
            Voulez-vous vraiment desactiver le site <strong>{siteDeactivateCandidate?.name}</strong> ?
          </p>
          <label className="admin-checkbox-row admin-confirm-choice">
            <input
              type="checkbox"
              checked={siteDeactivateRelatedListings}
              onChange={(event) => setSiteDeactivateRelatedListings(event.target.checked)}
              disabled={siteSubmitting}
            />
            <span>
              Desactiver aussi les annonces importees depuis le spider{' '}
              <strong>{siteDeactivateCandidate?.spider_name}</strong>
            </span>
          </label>
        </AdminConfirmModal>
      )}
    </>
  );
}
