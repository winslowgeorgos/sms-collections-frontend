// app/custom-campaigns/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import { Plus, Edit, Trash2, Search, Play, BarChart3, Eye, Send, AlertCircle, Info } from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import { usePermissions } from '@/context/permission-context'; // <-- ADDED

interface CustomCampaignFormData {
  campaign_name: string;
  template_id: string;
  customer_file: File | null;
  scheduled_date: string;
}

interface Template {
  id: string;
  template_name: string;
  template_desc: string;
  is_campaign_template: boolean;
}

interface CampaignStats {
  total_messages: number;
  success_count: number;
  failure_count: number;
}

interface ProcessedCampaign {
  campaign_id: string;
  campaign_name: string;
  template_name: string;
  payload_info: {
    count: number;
    payload_saved: boolean;
    payload_path: string;
  };
  preview: {
    first_message: string;
    sample_phone: string;
    total_messages: number;
  };
}

interface Campaign {
  id: string;
  campaign_name: string;
  template_content: string;
  template?: Template | null;
  template_id?: string | null;
  template_name?: string;
  template_content_preview?: string;
  status: 'DRAFT' | 'PROCESSING' | 'PROCESSED' | 'SENT' | 'FAILED';
  created_at: string;
  sent_count: number;
  failed_count: number;
  scheduled_date?: string;
  customer_file: string;
  processing_errors: any;
  is_active: boolean;
  created_by: string;
  updated_at: string;
}

export default function CustomCampaignsPage() {
  const { hasAccess } = usePermissions(); // <-- ADDED

  // Permission shortcuts – adjust codenames as needed
  const canCreate = hasAccess('add_customcampaign');
  const canChange = hasAccess('change_customcampaign');
  const canProcess = hasAccess('process_customcampaign');
  const canSend = hasAccess('send_customcampaign');
  const canApprove = hasAccess('approve_customcampaign');
  const canDelete = hasAccess('delete_customcampaign');
  const canView = hasAccess('view_customcampaign');

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null);
  const [processCampaign, setProcessCampaign] = useState<Campaign | null>(null);
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [campaignPayload, setCampaignPayload] = useState<any>(null);
  const [processedCampaign, setProcessedCampaign] = useState<ProcessedCampaign | null>(null);
  const [selectedTemplatePreview, setSelectedTemplatePreview] = useState<string>('');

  const [formData, setFormData] = useState<CustomCampaignFormData>({
    campaign_name: '',
    template_id: '',
    customer_file: null,
    scheduled_date: '',
  });

  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
  }, []);

  const fetchCampaigns = async (forceRefresh = false) => {
    if (!forceRefresh && lastFetchTime && (Date.now() - lastFetchTime < 30000)) {
      console.log('Using cached campaigns data');
      return;
    }
    
    try {
      setIsLoading(true);
      const client = apiClient.getClient();
      
      let response;
      let campaignsData: any[] = [];
      let usedEndpoint = '';
      
      const endpoints = [
        { 
          url: '/custom-campaigns/', 
          name: 'custom-campaigns',
          transform: (data: any) => data?.results || data || []
        },
        { 
          url: '/campaigns/list_campaigns/', 
          name: 'campaign-processor',
          transform: (data: any) => data?.campaigns?.map(transformCampaignFromProcessor) || []
        }
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint.name}`);
          response = await client.get(endpoint.url, {
            timeout: 10000,
            params: endpoint.name === 'custom-campaigns' ? {
              ordering: '-created_at'
            } : {}
          });
          
          campaignsData = endpoint.transform(response.data);
          usedEndpoint = endpoint.name;
          console.log(`Successfully fetched from ${endpoint.name}: ${campaignsData.length} campaigns`);
          break;
        } catch (endpointError: any) {
          console.warn(`Endpoint ${endpoint.name} failed:`, endpointError.message);
          continue;
        }
      }
      
      if (!usedEndpoint) {
        throw new Error('All campaign endpoints failed');
      }
      
      const transformedCampaigns = campaignsData.map((campaign: any) => {
        if (usedEndpoint === 'campaign-processor') {
          return transformCampaignFromProcessor(campaign);
        }
        return transformCampaignFromCustom(campaign);
      });
      
      const sortedCampaigns = transformedCampaigns.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setCampaigns(sortedCampaigns);
      setLastFetchTime(Date.now());
      setRetryCount(0);
      
      logCampaignAnalytics(sortedCampaigns, usedEndpoint);
      
    } catch (error: any) {
      console.error('All campaign fetch attempts failed:', error);
      
      if (retryCount < 3) {
        const nextRetryCount = retryCount + 1;
        setRetryCount(nextRetryCount);
        
        console.log(`Retrying fetch... (attempt ${nextRetryCount}/3)`);
        
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        
        setTimeout(() => {
          fetchCampaigns(true);
        }, delay);
        
      } else {
        showCampaignFetchError(error);
        setCampaigns([]);
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  const transformCampaignFromCustom = (campaign: any): Campaign => {
    return {
      id: campaign.id,
      campaign_name: campaign.campaign_name,
      template_content: campaign.template_content,
      template: campaign.template || (campaign.template_id ? {
        id: campaign.template_id,
        template_name: campaign.template_name || 'Unknown Template',
        template_desc: campaign.template_content || '',
        is_campaign_template: true
      } : null),
      template_id: campaign.template_id,
      template_name: campaign.template_name,
      template_content_preview: campaign.template_content_preview || campaign.template_content?.substring(0, 100) + '...',
      status: campaign.status,
      created_at: campaign.created_at,
      sent_count: campaign.sent_count || 0,
      failed_count: campaign.failed_count || 0,
      scheduled_date: campaign.scheduled_date,
      customer_file: campaign.customer_file,
      processing_errors: campaign.processing_errors,
      is_active: campaign.is_active !== undefined ? campaign.is_active : true,
      created_by: campaign.created_by,
      updated_at: campaign.updated_at
    };
  };

  const transformCampaignFromProcessor = (campaign: any): Campaign => {
    return {
      id: campaign.id,
      campaign_name: campaign.campaign_name,
      template_content: campaign.template_content_preview || '',
      template: campaign.template_id ? {
        id: campaign.template_id,
        template_name: campaign.template_name || 'Unknown Template',
        template_desc: campaign.template_content_preview || '',
        is_campaign_template: true
      } : null,
      template_id: campaign.template_id,
      template_name: campaign.template_name,
      template_content_preview: campaign.template_content_preview,
      status: campaign.status,
      created_at: campaign.created_at,
      sent_count: campaign.sent_count || 0,
      failed_count: campaign.failed_count || 0,
      scheduled_date: campaign.scheduled_date,
      customer_file: campaign.customer_file,
      processing_errors: campaign.processing_errors,
      is_active: true,
      created_by: campaign.created_by,
      updated_at: campaign.updated_at || campaign.created_at
    };
  };

  const logCampaignAnalytics = (campaigns: Campaign[], endpoint: string) => {
    const stats = {
      total: campaigns.length,
      byStatus: campaigns.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      withTemplate: campaigns.filter(c => c.template).length,
      withTemplateId: campaigns.filter(c => c.template_id).length,
      endpointUsed: endpoint
    };
    
    console.log('Campaign Analytics:', stats);
  };

  const showCampaignFetchError = (error: any) => {
    let userMessage = 'Unable to load campaigns. ';
    
    if (error.message.includes('network') || error.code === 'NETWORK_ERROR') {
      userMessage += 'Please check your internet connection and try again.';
    } else if (error.response?.status === 401) {
      userMessage += 'Your session may have expired. Please log in again.';
    } else if (error.response?.status === 403) {
      userMessage += 'You do not have permission to view campaigns.';
    } else if (error.response?.status === 404) {
      userMessage += 'Campaign service is currently unavailable.';
    } else {
      userMessage += 'Please try again later or contact support.';
    }
    
    console.error('Campaign fetch error:', error);
    alert(userMessage);
  };

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const client = apiClient.getClient();
      const response = await client.get('/templates/', {
        params: {
          is_campaign_template: 'true',
          is_active: 'true'
        }
      });
      
      const templatesData = response?.data?.results || response?.data || [];
      setTemplates(templatesData);
      
      if (templatesData.length === 0) {
        console.warn('No campaign templates found. Please mark some templates as campaign templates.');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      alert('Failed to load templates. Please check if templates exist.');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const resetForm = () => {
    setFormData({
      campaign_name: '',
      template_id: '',
      customer_file: null,
      scheduled_date: '',
    });
    setFormErrors({});
    setEditingCampaign(null);
    setSelectedTemplatePreview('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (campaign: Campaign) => {
    if (campaign.status === 'SENT') {
      alert('Cannot edit a campaign that has already been sent');
      return;
    }

    setFormData({
      campaign_name: campaign.campaign_name,
      template_id: campaign.template?.id || campaign.template_id || '',
      customer_file: null,
      scheduled_date: campaign.scheduled_date || '',
    });
    
    if (campaign.template) {
      setSelectedTemplatePreview(campaign.template.template_desc);
    } else if (campaign.template_content) {
      setSelectedTemplatePreview(campaign.template_content);
    }
    
    setEditingCampaign(campaign);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (campaign: Campaign) => {
    if (campaign.status === 'SENT') {
      alert('Cannot delete a campaign that has already been sent');
      return;
    }
    setDeleteCampaign(campaign);
    setIsDeleteModalOpen(true);
  };

  const handleOpenProcess = async (campaign: Campaign) => {
    if (campaign.status === 'SENT') {
      alert('Campaign has already been sent');
      return;
    }
    
    if (campaign.status === 'PROCESSED') {
      alert('Campaign is already processed and ready to send');
      return;
    }
    
    if (!campaign.template && !campaign.template_content_preview) {
      alert('Campaign must have a template before processing');
      return;
    }
    
    setProcessCampaign(campaign);
    setIsProcessModalOpen(true);
  };

  const handleOpenView = async (campaign: Campaign) => {
    setViewCampaign(campaign);
    try {
      const client = apiClient.getClient();
      const response = await client.get(`/campaigns/get_campaign_payload/?campaign_id=${campaign.id}`);
      setCampaignPayload(response.data);
    } catch (error: any) {
      console.error('Error fetching campaign payload:', error);
      setCampaignPayload(null);
      if (error.response?.status === 404) {
        alert('Campaign payload not found. Process the campaign first.');
      }
    }
    setIsViewModalOpen(true);
  };

  const handleSendCampaign = async (campaign: Campaign) => {
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
        await fetchCampaigns();
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

    if (!formData.template_id) {
      errors.template_id = 'Template selection is required';
    } else {
      const selectedTemplate = templates.find(t => t.id === formData.template_id);
      if (!selectedTemplate) {
        errors.template_id = 'Selected template is invalid';
      }
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
      
      const selectedTemplate = templates.find(t => t.id === formData.template_id);
      if (!selectedTemplate) {
        throw new Error('Please select a valid template');
      }
      
      if (editingCampaign) {
        const submitData = new FormData();
        submitData.append('campaign_name', formData.campaign_name);
        submitData.append('template_id', formData.template_id);
        submitData.append('template_content', selectedTemplate.template_desc);
        submitData.append('scheduled_date', formData.scheduled_date);
        
        if (formData.customer_file) {
          submitData.append('customer_file', formData.customer_file);
        }
        
        const response = await client.patch(`/custom-campaigns/${editingCampaign.id}/`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (response.data) {
          await fetchCampaigns();
          handleCloseModal();
          alert('Campaign updated successfully!');
        }
      } else {
        const submitData = new FormData();
        submitData.append('campaign_name', formData.campaign_name);
        submitData.append('template_id', formData.template_id);
        submitData.append('template_content', selectedTemplate.template_desc);
        submitData.append('scheduled_date', formData.scheduled_date);
        
        if (formData.customer_file) {
          submitData.append('customer_file', formData.customer_file);
        } else {
          throw new Error('Customer file is required');
        }
        
        const response = await client.post('/custom-campaigns/', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (response.data) {
          await fetchCampaigns();
          handleCloseModal();
          alert('Campaign created successfully!');
        }
      }
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        const errors: Record<string, string> = {};
        
        if (typeof errorData === 'object') {
          Object.keys(errorData).forEach(key => {
            if (Array.isArray(errorData[key])) {
              errors[key] = errorData[key].join(', ');
            } else {
              errors[key] = errorData[key];
            }
          });
          setFormErrors(errors);
        }
        
        alert('Error: ' + (errorData.error || errorData.template_content || 'Failed to save campaign'));
      } else {
        alert('Failed to save campaign: ' + (error.message || 'Please try again.'));
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
      alert('Campaign deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign: ' + (error.response?.data?.error || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessCampaign = async () => {
    if (!processCampaign) return;

    setIsProcessing(true);
    try {
      const client = apiClient.getClient();
      
      if (!processCampaign.template && !processCampaign.template_content_preview) {
        alert('Campaign must have a template before processing. Please edit the campaign to assign a template.');
        return;
      }
      
      const response = await client.post('/campaigns/process_campaign/', {
        campaign_id: processCampaign.id
      });

      if (response.data.status === 'success') {
        setProcessedCampaign(response.data);
        setCampaignStats({
          total_messages: response.data.payload_info.count,
          success_count: 0,
          failure_count: 0
        });
        await fetchCampaigns();
        alert('Campaign processed successfully!');
      } else {
        alert('Failed to process campaign: ' + response.data.error);
      }
    } catch (error: any) {
      console.error('Error processing campaign:', error);
      
      if (error.response?.data?.error?.includes('No template selected')) {
        alert('This campaign has no template assigned. Please edit the campaign to assign a template first.');
      } else {
        alert('Error processing campaign: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
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

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setFormData(prev => ({
      ...prev,
      template_id: templateId
    }));

    const selectedTemplate = templates.find(t => t.id === templateId);
    if (selectedTemplate) {
      setSelectedTemplatePreview(selectedTemplate.template_desc);
    } else {
      setSelectedTemplatePreview('');
    }

    if (formErrors.template_id) {
      setFormErrors(prev => ({ ...prev, template_id: '' }));
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return '📝';
      case 'PROCESSING': return '🔄';
      case 'PROCESSED': return '✅';
      case 'SENT': return '📤';
      case 'FAILED': return '❌';
      default: return '📝';
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      campaign.campaign_name.toLowerCase().includes(searchLower) ||
      (campaign.template?.template_name?.toLowerCase() || '').includes(searchLower) ||
      campaign.status.toLowerCase().includes(searchLower)
    );
  });

  const columns = [
    {
      id: 'campaign_name',
      label: 'Campaign Name',
      accessor: (row: Campaign) => row.campaign_name,
      Cell: (value: string, row: Campaign) => (
        <div>
          <p className="font-medium text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">ID: {row.id.substring(0, 8)}...</p>
        </div>
      ),
      width: 200,
    },
    {
      id: 'template',
      label: 'Template',
      accessor: (row: Campaign) => row.template?.template_name || row.template_name || 'No template',
      Cell: (value: string, row: Campaign) => (
        <div>
          <p className="text-gray-900 font-medium">{value}</p>
          {(row.template?.template_desc || row.template_content_preview) && (
            <p className="text-gray-600 text-xs mt-1 line-clamp-1">
              {row.template?.template_desc || row.template_content_preview}
            </p>
          )}
          {row.template_id && !row.template && (
            <p className="text-xs text-blue-600">Template ID: {row.template_id.substring(0, 8)}...</p>
          )}
        </div>
      ),
      width: 250,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (row: Campaign) => row.status,
      Cell: (value: string) => (
        <div className="flex items-center">
          <span className="mr-2">{getStatusIcon(value)}</span>
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(value)}`}>
            {value}
          </span>
        </div>
      ),
      width: 120,
    },
    {
      id: 'scheduled_date',
      label: 'Scheduled Date',
      accessor: (row: Campaign) => row.scheduled_date,
      Cell: (value: string) => (
        <span className="text-gray-600 text-sm">
          {value ? new Date(value).toLocaleString() : 'Not scheduled'}
        </span>
      ),
      width: 180,
    },
    {
      id: 'stats',
      label: 'Statistics',
      accessor: (row: Campaign) => row,
      Cell: (value: Campaign) => (
        <div className="flex items-center space-x-2 text-xs">
          {value.status === 'SENT' && (
            <>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                Sent: {value.sent_count || 0}
              </span>
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                Failed: {value.failed_count || 0}
              </span>
            </>
          )}
          {value.status === 'PROCESSED' && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Ready: {value.sent_count || 0} messages
            </span>
          )}
          {value.status === 'DRAFT' && (
            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
              Draft
            </span>
          )}
        </div>
      ),
      width: 150,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: Campaign) => row,
      Cell: (value: Campaign) => (
        <div className="flex space-x-2">
          {/* View Button – requires view permission */}
          {canView && (
            <button
              onClick={() => handleOpenView(value)}
              className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
              title="View campaign payload"
            >
              <Eye size={16} />
            </button>
          )}

          {/* Process Button – requires change permission and appropriate status */}
          {canProcess && (value.status === 'DRAFT' || value.status === 'FAILED') && (
            <button
              onClick={() => handleOpenProcess(value)}
              className="text-green-600 hover:text-green-700 transition-colors p-1 rounded hover:bg-green-50"
              title="Process campaign"
            >
              <Play size={16} />
            </button>
          )}

          {/* Send Button – requires change permission and processed status */}
          {canSend && value.status === 'PROCESSED' && (
            <button
              onClick={() => handleSendCampaign(value)}
              className="text-purple-600 hover:text-purple-700 transition-colors p-1 rounded hover:bg-purple-50"
              title="Send campaign"
              disabled={isSending}
            >
              <Send size={16} />
            </button>
          )}

          {/* Edit Button – requires change permission and not sent */}
          {canChange && value.status !== 'SENT' && (
            <button
              onClick={() => handleOpenEdit(value)}
              className="text-yellow-600 hover:text-yellow-700 transition-colors p-1 rounded hover:bg-yellow-50"
              title="Edit campaign"
            >
              <Edit size={16} />
            </button>
          )}

          {/* Delete Button – requires delete permission and not sent */}
          {canDelete && value.status !== 'SENT' && (
            <button
              onClick={() => handleOpenDelete(value)}
              className="text-red-600 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
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
        <div className="flex space-x-2">
          {/* Create Campaign button – requires add permission */}
          {canCreate && (
            <Button onClick={handleOpenCreate} className="bg-accent-600 hover:bg-accent-700">
              <Plus size={20} className="mr-2" />
              Create Campaign
            </Button>
          )}
          <Button
            onClick={() => fetchCampaigns(true)}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900 mr-2"></div>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search campaigns by name, template, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-900">All Campaigns ({filteredCampaigns.length})</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="flex items-center">
                <span className="w-3 h-3 bg-gray-100 rounded-full mr-1"></span> Draft
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 bg-green-100 rounded-full mr-1"></span> Processed
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 bg-purple-100 rounded-full mr-1"></span> Sent
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-lg text-gray-600">Loading campaigns...</div>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No campaigns found.</p>
              <p className="text-sm mt-2">Create your first campaign to get started.</p>
            </div>
          ) : (
            <GenericTable
              data={filteredCampaigns}
              columns={columns}
              rowKey={(row: Campaign) => row.id}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Template <span className="text-error-500">*</span>
            </label>
            <select
              name="template_id"
              value={formData.template_id}
              onChange={handleTemplateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              required
              disabled={isLoadingTemplates}
            >
              <option value="">Select a template</option>
              {isLoadingTemplates ? (
                <option disabled>Loading templates...</option>
              ) : templates.length === 0 ? (
                <option disabled>No campaign templates available. Please create templates first.</option>
              ) : (
                templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.template_name} {template.is_campaign_template ? '📧' : ''}
                  </option>
                ))
              )}
            </select>
            {formErrors.template_id && (
              <p className="mt-1 text-sm text-error-500">{formErrors.template_id}</p>
            )}
            
            {selectedTemplatePreview && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Template Preview:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedTemplatePreview}</p>
                <p className="text-xs text-gray-500 mt-2">
                  <AlertCircle size={12} className="inline mr-1" />
                  Variables in template will be replaced with data from your Excel file.
                </p>
              </div>
            )}
            
            {templates.length === 0 && !isLoadingTemplates && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <AlertCircle size={14} className="inline mr-1" />
                  No campaign templates found. Please mark templates as "campaign template" in the Templates section.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer File {!editingCampaign && <span className="text-error-500">*</span>}
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              disabled={!!editingCampaign && !formData.customer_file}
            />
            {formErrors.customer_file && (
              <p className="mt-1 text-sm text-error-500">{formErrors.customer_file}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Upload CSV or Excel file with customer data. Required columns: <strong>customer_name</strong>, <strong>phone_number</strong>, and any variables used in the selected template.
            </p>
            <p className="mt-1 text-xs text-blue-600">
              <strong>Note:</strong> Check the template preview above to see which variables need to be in your file.
            </p>
            {editingCampaign && formData.customer_file === null && (
              <p className="mt-1 text-xs text-gray-500 italic">
                Current file will be kept. Upload new file only if you want to replace it.
              </p>
            )}
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
              disabled={isSubmitting || (templates.length === 0 && !isLoadingTemplates)}
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
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
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
              {isSubmitting ? 'Deleting...' : 'Delete Campaign'}
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
            <p className="text-gray-600 mb-2">Template: {processCampaign?.template?.template_name || 'No template'}</p>
            <div className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
              {processCampaign?.sent_count || 0} customers in file
            </div>
          </div>

          {processedCampaign ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-2">
                  <div className="h-2 w-2 rounded-full bg-green-600"></div>
                </div>
                <h4 className="font-semibold text-green-800">Campaign Processed Successfully!</h4>
              </div>
              <div className="space-y-2 text-sm text-green-700 ml-7">
                <p><strong>Total Messages:</strong> {processedCampaign.payload_info.count}</p>
                <p><strong>Template Used:</strong> {processedCampaign.template_name}</p>
                <p><strong>Sample Message:</strong> <span className="italic">"{processedCampaign.preview.first_message.substring(0, 80)}..."</span></p>
                <p><strong>Sample Phone:</strong> {processedCampaign.preview.sample_phone}</p>
              </div>
              <p className="text-xs text-green-600 mt-3 ml-7">
                The campaign is now ready to be sent. Click "Send Campaign" from the main table to send messages.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Processing this campaign will generate SMS messages for all customers in the uploaded file. 
                    You will be able to review the messages before sending.
                  </p>
                  <p className="text-xs text-yellow-700 mt-2">
                    This may take a few moments depending on the file size.
                  </p>
                </div>
              </div>
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
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : 'Process Campaign'}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* View Campaign Payload Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        title="Campaign Details"
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Campaign Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong className="text-gray-600">Name:</strong>
                <p className="font-medium">{viewCampaign?.campaign_name}</p>
              </div>
              <div>
                <strong className="text-gray-600">Status:</strong>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(viewCampaign?.status || '')}`}>
                  {viewCampaign?.status}
                </span>
              </div>
              <div>
                <strong className="text-gray-600">Template:</strong>
                <p className="font-medium">
                  {viewCampaign?.template?.template_name || viewCampaign?.template_name || 'No template'}
                  {viewCampaign?.template_id && !viewCampaign?.template && (
                    <span className="text-xs text-blue-600 ml-2">(ID: {viewCampaign.template_id.substring(0, 8)}...)</span>
                  )}
                </p>
              </div>
              <div>
                <strong className="text-gray-600">Scheduled:</strong>
                <p>{viewCampaign?.scheduled_date ? new Date(viewCampaign.scheduled_date).toLocaleString() : 'Not scheduled'}</p>
              </div>
              <div>
                <strong className="text-gray-600">Created:</strong>
                <p>{viewCampaign?.created_at ? new Date(viewCampaign.created_at).toLocaleString() : 'N/A'}</p>
              </div>
              <div>
                <strong className="text-gray-600">Messages:</strong>
                <p>{viewCampaign?.sent_count || 0} sent, {viewCampaign?.failed_count || 0} failed</p>
              </div>
            </div>
            
            {(viewCampaign?.template?.template_desc || viewCampaign?.template_content) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <strong className="text-gray-600">Template Content:</strong>
                  {viewCampaign?.template?.id && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Template ID: {viewCampaign.template.id.substring(0, 8)}...
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-gray-700 bg-white p-3 rounded border">
                  <pre className="whitespace-pre-wrap font-sans">
                    {viewCampaign?.template?.template_desc || viewCampaign?.template_content}
                  </pre>
                </div>
                <div className="mt-2 text-xs text-gray-500 flex items-center">
                  <AlertCircle size={12} className="mr-1" />
                  Variables like <span className="font-mono">{"{{customer_name}}"}</span> will be replaced with data from the Excel file
                </div>
              </div>
            )}

            {viewCampaign?.customer_file && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <strong className="text-gray-600">Customer File:</strong>
                <div className="mt-2 flex items-center justify-between">
                  <a 
                    href={viewCampaign.customer_file} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Excel File
                  </a>
                  {viewCampaign.sent_count > 0 && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {viewCampaign.sent_count} customers processed
                    </span>
                  )}
                </div>
              </div>
            )}

            {viewCampaign?.processing_errors && (
              <div className="mt-4 pt-4 border-t border-red-200 bg-red-50 rounded p-3">
                <div className="flex items-center mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <strong className="text-red-800">Processing Errors:</strong>
                </div>
                <pre className="text-sm text-red-700 whitespace-pre-wrap">
                  {JSON.stringify(viewCampaign.processing_errors, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {campaignPayload ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">Advanta Payload</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {campaignPayload.count || 0} messages
                  </span>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(JSON.stringify(campaignPayload, null, 2));
                        alert('Payload copied to clipboard!');
                      } catch (error) {
                        console.error('Failed to copy:', error);
                      }
                    }}
                    className="text-xs bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="relative">
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm max-h-96">
                  {JSON.stringify(campaignPayload, null, 2)}
                </pre>
              </div>
              <div className="mt-3 text-xs text-gray-500 flex items-center">
                <Info size={12} className="mr-1" />
                This is the payload that will be sent to Advanta SMS gateway.
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                <Eye className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-700">No payload data available.</p>
              <p className="text-sm mt-2">Process the campaign first to generate payload.</p>
              <div className="mt-4 flex justify-center space-x-2">
                {viewCampaign?.status === 'DRAFT' && (
                  <Button
                    onClick={() => {
                      handleCloseViewModal();
                      handleOpenProcess(viewCampaign!);
                    }}
                  >
                    <Play size={16} className="mr-2" />
                    Process Campaign
                  </Button>
                )}
                {viewCampaign?.status === 'PROCESSED' && (
                  <Button
                    onClick={() => {
                      handleCloseViewModal();
                      handleSendCampaign(viewCampaign!);
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Send size={16} className="mr-2" />
                    Send Campaign
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Last updated: {viewCampaign?.updated_at ? new Date(viewCampaign.updated_at).toLocaleString() : 'N/A'}
            </div>
            <div className="flex space-x-2">
              {viewCampaign?.status === 'DRAFT' && canChange && (
                <Button
                  variant="outline"
                  onClick={() => {
                    handleCloseViewModal();
                    handleOpenEdit(viewCampaign!);
                  }}
                >
                  <Edit size={16} className="mr-2" />
                  Edit Campaign
                </Button>
              )}
              <Button variant="outline" onClick={handleCloseViewModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}