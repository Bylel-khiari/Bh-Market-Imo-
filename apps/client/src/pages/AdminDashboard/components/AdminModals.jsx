import React from 'react';
import AdminPropertyModal from './AdminPropertyModal';
import AdminSiteModal from './AdminSiteModal';
import { AdminConfirmModal } from './AdminModalShell';
import AdminUserModal from './AdminUserModal';

export default function AdminModals({
  activeSection,
  closeDeleteConfirm,
  closeDeletePropertyConfirm,
  closeDeleteSiteConfirm,
  deleteCandidate,
  editingPropertyId,
  editingSiteId,
  editingUserId,
  formData,
  formMessage,
  formMode,
  handleDeleteConfirmed,
  handleDeletePropertyConfirmed,
  handleDeleteSiteConfirmed,
  handleFormChange,
  handleGeneratePassword,
  handlePropertyFormChange,
  handlePropertySubmit,
  handleSiteFormChange,
  handleSiteSubmit,
  handleSubmit,
  isEditPanelOpen,
  isPropertyPanelOpen,
  isSitePanelOpen,
  openCreatePanel,
  openCreatePropertyPanel,
  openCreateSitePanel,
  propertyDeleteCandidate,
  propertyFormData,
  propertyFormMessage,
  propertyFormMode,
  propertySubmitting,
  resetForm,
  resetPropertyForm,
  resetSiteForm,
  siteDeleteCandidate,
  siteFormData,
  siteFormMessage,
  siteFormMode,
  siteSubmitting,
  submitting,
}) {
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
