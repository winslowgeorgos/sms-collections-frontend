// app/custom-campaigns/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import { CustomCampaign } from '@/types';
import { Plus, Edit, Trash2, Search, Play, BarChart3, Eye, Send } from 'lucide-react';
import GenericTable from '@/components/ui/cTable';

interface CustomCampaignFormData {
  campaign_name: string;
  template_content: string;
  customer_file: File | null;
  scheduled_date: string;
}

interface CampaignStats {
  total_messages: number;
  success_count: number;
  failure_count: number;
}

interface ProcessedCampaign {
  campaign_id: string;
  campaign_name: string;
  payload_info: {
    count: number;
    payload_saved: boolean;
  };
  preview: {
    first_message: string;
    sample_phone: string;
    total_messages: number;
  };
}

export default function CustomCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [deleteCampaign, setDeleteCampaign] = useState<any | null>(null);
  const [processCampaign, setProcessCampaign] = useState<any | null>(null);
  const [viewCampaign, setViewCampaign] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [campaignPayload, setCampaignPayload] = useState<any>(null);
  const [processedCampaign, setProcessedCampaign] = useState<ProcessedCampaign | null>(null);

  const [formData, setFormData] = useState<CustomCampaignFormData>({
    campaign_name: '',
    template_content: '',
    customer_file: null,
    scheduled_date: '',
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/campaigns/list_campaigns/');
      setCampaigns(response?.data?.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      campaign_name: '',
      template_content: '',
      customer_file: null,
      scheduled_date: '',
    });
    setFormErrors({});
    setEditingCampaign(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (campaign: any) => {
    // Only allow editing if campaign is not sent
    if (campaign.status === 'SENT') {
      alert('Cannot edit a campaign that has already been sent');
      return;
    }

    setFormData({
      campaign_name: campaign.campaign_name,
      template_content: campaign.template_content,
      customer_file: null,
      scheduled_date: campaign.scheduled_date,
    });
    setEditingCampaign(campaign);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (campaign: any) => {
    // Only allow deletion if campaign is not sent
    if (campaign.status === 'SENT') {
      alert('Cannot delete a campaign that has already been sent');
      return;
    }
    setDeleteCampaign(campaign);
    setIsDeleteModalOpen(true);
  };

  const handleOpenProcess = async (campaign: any) => {
    // Only allow processing if campaign is in DRAFT or PROCESSED state
    if (campaign.status === 'SENT') {
      alert('Campaign has already been sent');
      return;
    }
    
    setProcessCampaign(campaign);
    setIsProcessModalOpen(true);
  };

  const handleOpenView = async (campaign: any) => {
    setViewCampaign(campaign);
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/campaigns/get_campaign_payload/?campaign_id=${campaign.id}`);
      setCampaignPayload(response.data);
    } catch (error: any) {
      console.error('Error fetching campaign payload:', error);
      setCampaignPayload(null);
    }
    setIsViewModalOpen(true);
  };

  const handleSendCampaign = async (campaign: any) => {
    // Only allow sending if campaign is PROCESSED
    if (campaign.status !== 'PROCESSED') {
      alert('Campaign must be processed before sending');
      return;
    }

    if (!confirm('Are you sure you want to send this campaign? This will send SMS messages to all customers.')) {
      return;
    }

    setIsSending(true);
    try {
      const client = apiClient.getClient();
      const response = await client.post('/campaigns/send_campaign/', {
        campaign_id: campaign.id
      });

      if (response.data.status === 'success') {
        alert(`Campaign sent successfully! Success: ${response.data.results.success}, Failed: ${response.data.results.failed}`);
        await fetchCampaigns(); // Refresh campaigns list
      } else {
        alert('Failed to send campaign: ' + response.data.error);
      }
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      alert('Error sending campaign: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteCampaign(null);
  };

  const handleCloseProcessModal = () => {
    setIsProcessModalOpen(false);
    setProcessCampaign(null);
    setCampaignStats(null);
    setProcessedCampaign(null);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewCampaign(null);
    setCampaignPayload(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.campaign_name.trim()) {
      errors.campaign_name = 'Campaign name is required';
    }

    if (!formData.template_content.trim()) {
      errors.template_content = 'Template content is required';
    }

    if (!editingCampaign && !formData.customer_file) {
      errors.customer_file = 'Customer file is required';
    }

    if (!formData.scheduled_date) {
      errors.scheduled_date = 'Scheduled date is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      
      const submitData = new FormData();
      submitData.append('campaign_name', formData.campaign_name);
      submitData.append('template_content', formData.template_content);
      submitData.append('scheduled_date', formData.scheduled_date);
      
      if (formData.customer_file) {
        submitData.append('customer_file', formData.customer_file);
      }

      if (editingCampaign) {
        await client.put(`/custom-campaigns/${editingCampaign.id}/`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await client.post('/campaigns/', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      await fetchCampaigns();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      if (error.response?.data) {
        setFormErrors(error.response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCampaign) return;

    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.delete(`/custom-campaigns/${deleteCampaign.id}/`);
      await fetchCampaigns();
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Error deleting campaign:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessCampaign = async () => {
    if (!processCampaign) return;

    setIsProcessing(true);
    try {
      const client = apiClient.getClient();
      const response = await client.post('/campaigns/process_campaign/', {
        campaign_id: processCampaign.id
      });

      if (response.data.status === 'success') {
        setProcessedCampaign(response.data);
        setCampaignStats({
          total_messages: response.data.payload_info.count,
          success_count: 0, // Will be updated after sending
          failure_count: 0
        });
        await fetchCampaigns(); // Refresh to get updated status
      } else {
        alert('Failed to process campaign: ' + response.data.error);
      }
    } catch (error: any) {
      console.error('Error processing campaign:', error);
      alert('Error processing campaign: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      customer_file: file
    }));

    if (formErrors.customer_file) {
      setFormErrors(prev => ({ ...prev, customer_file: '' }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800';
      case 'PROCESSED': return 'bg-green-100 text-green-800';
      case 'SENT': return 'bg-purple-100 text-purple-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    {
      id: 'campaign_name',
      label: 'Campaign Name',
      accessor: (row: any) => row.campaign_name,
      width: 200,
    },
    {
      id: 'template_content',
      label: 'Template',
      accessor: (row: any) => row.template_content,
      Cell: (value: string) => (
        <p className="text-gray-600 text-sm line-clamp-2">{value}</p>
      ),
      width: 250,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (row: any) => row.status,
      Cell: (value: string) => (
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(value)}`}>
          {value}
        </span>
      ),
      width: 120,
    },
    {
      id: 'scheduled_date',
      label: 'Scheduled Date',
      accessor: (row: any) => row.scheduled_date,
      Cell: (value: string) => (
        <span className="text-gray-600 text-sm">
          {new Date(value).toLocaleString()}
        </span>
      ),
      width: 180,
    },
    {
      id: 'stats',
      label: 'Statistics',
      accessor: (row: any) => row,
      Cell: (value: any) => (
        <div className="flex items-center space-x-2 text-xs">
          <span className="bg-success-100 text-success-800 px-2 py-1 rounded">
            Sent: {value.sent_count || 0}
          </span>
          <span className="bg-error-100 text-error-800 px-2 py-1 rounded">
            Failed: {value.failed_count || 0}
          </span>
        </div>
      ),
      width: 150,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: any) => row,
      Cell: (value: any) => (
        <div className="flex space-x-2">
          {/* View Button - Always visible */}
          <button
            onClick={() => handleOpenView(value)}
            className="text-blue-600 hover:text-blue-700 transition-colors"
            title="View campaign payload"
          >
            <Eye size={16} />
          </button>

          {/* Process/Approve Button - Only for DRAFT status */}
          {value.status === 'DRAFT' && (
            <button
              onClick={() => handleOpenProcess(value)}
              className="text-green-600 hover:text-green-700 transition-colors"
              title="Process campaign"
            >
              <Play size={16} />
            </button>
          )}

          {/* Send Button - Only for PROCESSED status */}
          {value.status === 'PROCESSED' && (
            <button
              onClick={() => handleSendCampaign(value)}
              className="text-purple-600 hover:text-purple-700 transition-colors"
              title="Send campaign"
              disabled={isSending}
            >
              <Send size={16} />
            </button>
          )}

          {/* Edit Button - Only for DRAFT and PROCESSED status (not SENT) */}
          {value.status !== 'SENT' && (
            <button
              onClick={() => handleOpenEdit(value)}
              className="text-accent-600 hover:text-accent-700 transition-colors"
              title="Edit campaign"
            >
              <Edit size={16} />
            </button>
          )}

          {/* Delete Button - Only for DRAFT and PROCESSED status (not SENT) */}
          {value.status !== 'SENT' && (
            <button
              onClick={() => handleOpenDelete(value)}
              className="text-error-600 hover:text-error-700 transition-colors"
              title="Delete campaign"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
      width: 180,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custom Campaigns</h1>
          <p className="text-gray-600 mt-2">Manage custom SMS campaigns and bulk messaging</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-accent-600 hover:bg-accent-700">
          <Plus size={20} className="mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-900">All Campaigns</h2>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-lg text-gray-600">Loading campaigns...</div>
            </div>
          ) : (
            <GenericTable
              data={campaigns}
              columns={columns}
              rowKey={(row: any) => row.id}
              selectionMode="none"
              virtualized={true}
            />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
        size="lg"
        isLoading={isSubmitting}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Campaign Name"
            name="campaign_name"
            type="text"
            value={formData.campaign_name}
            onChange={handleInputChange}
            error={formErrors.campaign_name}
            required
            placeholder="Enter campaign name"
          />

          <FormInput
            label="Template Content"
            name="template_content"
            type="textarea"
            value={formData.template_content}
            onChange={handleInputChange}
            error={formErrors.template_content}
            required
            placeholder="Enter SMS template content with variables like {{name}}, {{loan_limit}}, {{interest}}, etc."
            rows={6}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer File {!editingCampaign && <span className="text-error-500">*</span>}
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            />
            {formErrors.customer_file && (
              <p className="mt-1 text-sm text-error-500">{formErrors.customer_file}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Upload CSV or Excel file with customer data. Required columns: customer_name, phone_number, and any variables used in template.
            </p>
          </div>

          <FormInput
            label="Scheduled Date & Time"
            name="scheduled_date"
            type="datetime-local"
            value={formData.scheduled_date}
            onChange={handleInputChange}
            error={formErrors.scheduled_date}
            required
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-accent-600 hover:bg-accent-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingCampaign ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Campaign"
        size="sm"
        isLoading={isSubmitting}
      >
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete <strong>{deleteCampaign?.campaign_name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-3">
            <Button
              variant="outline"
              onClick={handleCloseDeleteModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-error-600 hover:bg-error-700"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Process Campaign Modal */}
      <Modal
        isOpen={isProcessModalOpen}
        onClose={handleCloseProcessModal}
        title="Process Campaign"
        size="md"
        isLoading={isProcessing}
      >
        <div className="space-y-4">
          <div className="text-center">
            <BarChart3 size={48} className="mx-auto text-accent-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">{processCampaign?.campaign_name}</h3>
            <p className="text-gray-600 mb-6">Process this campaign to generate SMS messages</p>
          </div>

          {processedCampaign ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Campaign Processed Successfully!</h4>
              <div className="space-y-2 text-sm text-green-700">
                <p><strong>Total Messages:</strong> {processedCampaign.payload_info.count}</p>
                <p><strong>Sample Message:</strong> {processedCampaign.preview.first_message}</p>
                <p><strong>Sample Phone:</strong> {processedCampaign.preview.sample_phone}</p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Processing this campaign will generate SMS messages for all customers in the uploaded file. 
                You will be able to review the messages before sending.
              </p>
            </div>
          )}

          <div className="flex justify-center space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCloseProcessModal}
              disabled={isProcessing}
            >
              {processedCampaign ? 'Close' : 'Cancel'}
            </Button>
            {!processedCampaign && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleProcessCampaign}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Process Campaign'}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* View Campaign Payload Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        title="Campaign Payload"
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Campaign Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Name:</strong> {viewCampaign?.campaign_name}
              </div>
              <div>
                <strong>Status:</strong> <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(viewCampaign?.status)}`}>
                  {viewCampaign?.status}
                </span>
              </div>
              <div>
                <strong>Scheduled:</strong> {viewCampaign?.scheduled_date ? new Date(viewCampaign.scheduled_date).toLocaleString() : 'N/A'}
              </div>
              <div>
                <strong>Messages:</strong> {viewCampaign?.sent_count || 0} sent, {viewCampaign?.failed_count || 0} failed
              </div>
            </div>
          </div>

          {campaignPayload ? (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Advanta Payload</h4>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm max-h-96">
                {JSON.stringify(campaignPayload, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No payload data available.</p>
              <p className="text-sm">Process the campaign first to generate payload.</p>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={handleCloseViewModal}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}