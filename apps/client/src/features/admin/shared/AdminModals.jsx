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
    closeDeleteSiteConfirm,
    editingSiteId,
    handleDeleteSiteConfirmed,
    handleSiteFormChange,
    handleSiteSubmit,
    isSitePanelOpen,
    openCreateSitePanel,
    resetSiteForm,
    siteDeleteCandidate,
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
          Voulez-vous vraiment supprimer le site <strong>{siteDeleteCandidate?.name}</strong> ?
        </AdminConfirmModal>
      )}
    </>
  );
}
