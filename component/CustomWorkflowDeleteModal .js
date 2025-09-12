"use client";
import React from 'react';
import { FiX, FiTrash2, FiEdit3 } from 'react-icons/fi';

const CustomWorkflowDeleteModal = ({ 
  isOpen, 
  onClose, 
  reminder, 
  onDeleteWorkflow, 
  onDeleteTemplate,
  deleteLoading 
}) => {
  if (!isOpen) return null;

  const isCustomWorkflow = reminder?.categoryName === 'Custom workflow';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={deleteLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <FiX size={20} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Delete Options for "{reminder?.title}"
          </h2>
          <p className="text-sm text-gray-600">
            {isCustomWorkflow 
              ? "Choose how you want to handle this custom workflow:"
              : "This is a predefined workflow. You can only clean template data:"
            }
          </p>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {isCustomWorkflow && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <FiTrash2 className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="text-sm font-medium text-red-900">
                    Delete Entire Workflow
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    Permanently remove this custom workflow. This cannot be undone.
                  </p>
                  <button
                    onClick={() => onDeleteWorkflow(reminder)}
                    disabled={deleteLoading}
                    className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <FiTrash2 className="w-3 h-3 mr-1" />
                        Delete Workflow
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                <FiEdit3 className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="text-sm font-medium text-yellow-900">
                  Clean Template Data Only
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Remove template configurations but keep the workflow event. You can reconfigure it later.
                </p>
                <button
                  onClick={() => onDeleteTemplate(reminder)}
                  disabled={deleteLoading}
                  className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <FiEdit3 className="w-3 h-3 mr-1" />
                      Clean Template
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            disabled={deleteLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomWorkflowDeleteModal;