// app/products/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormInput } from '@/components/forms/FormInput';
import { apiClient } from '@/lib/api';
import { Product } from '@/types';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import GenericTable from '@/components/ui/cTable';
import { usePermissions } from '@/context/permission-context'; // <-- ADDED

interface ProductFormData {
  product_name: string;
  product_description: string;
  product_term: number;
  default_days: number;
  is_active: boolean;
}

export default function ProductsPage() {
  const { hasAccess } = usePermissions(); // <-- ADDED

  // Permission shortcuts – adjust codenames as needed
  const canCreate = hasAccess('add_product');
  const canChange = hasAccess('change_product');
  const canDelete = hasAccess('delete_product');

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<ProductFormData>({
    product_name: '',
    product_description: '',
    product_term: 0,
    default_days: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const client = apiClient.getClient();
      const response = await client.get('/products/');
      setProducts(response?.data?.results || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      product_description: '',
      product_term: 0,
      default_days: 0,
      is_active: true,
    });
    setFormErrors({});
    setEditingProduct(null);
  };

  const handleOpenCreate = () => {
    if (!canCreate) return; // Guard
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    if (!canChange) return; // Guard
    setFormData({
      product_name: product.product_name,
      product_description: product.product_description,
      product_term: product.product_term,
      default_days: product.default_days,
      is_active: product.is_active,
    });
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (product: Product) => {
    if (!canDelete) return; // Guard
    setDeleteProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteProduct(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.product_name.trim()) {
      errors.product_name = 'Product name is required';
    }

    if (!formData.product_description.trim()) {
      errors.product_description = 'Product description is required';
    }

    if (formData.product_term <= 0) {
      errors.product_term = 'Product term must be greater than 0';
    }

    if (formData.default_days <= 0) {
      errors.default_days = 'Default days must be greater than 0';
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
      
      if (editingProduct) {
        await client.put(`/products/${editingProduct.id}/`, formData);
      } else {
        await client.post('/products/', formData);
      }

      await fetchProducts();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving product:', error);
      if (error.response?.data) {
        setFormErrors(error.response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;

    setIsSubmitting(true);
    try {
      const client = apiClient.getClient();
      await client.delete(`/products/${deleteProduct.id}/`);
      await fetchProducts();
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' ? Number(value) : value
    }));

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const columns = [
    {
      id: 'product_name',
      label: 'Product Name',
      accessor: (row: Product) => row.product_name,
      width: 200,
    },
    {
      id: 'product_description',
      label: 'Description',
      accessor: (row: Product) => row.product_description,
      Cell: (value: string) => (
        <p className="text-gray-600 text-sm line-clamp-2">{value}</p>
      ),
      width: 300,
    },
    {
      id: 'product_term',
      label: 'Term (Days)',
      accessor: (row: Product) => row.product_term,
      width: 120,
    },
    {
      id: 'default_days',
      label: 'Default Days',
      accessor: (row: Product) => row.default_days,
      width: 120,
    },
    {
      id: 'is_active',
      label: 'Status',
      accessor: (row: Product) => row.is_active,
      Cell: (value: boolean) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value ? 'bg-success-100 text-success-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
      width: 100,
    },
    {
      id: 'created_at',
      label: 'Created At',
      accessor: (row: Product) => row.created_at,
      Cell: (value: string) => (
        <span className="text-gray-600 text-sm">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
      width: 150,
    },
    {
      id: 'actions',
      label: 'Actions',
      accessor: (row: Product) => row,
      Cell: (value: Product) => (
        <div className="flex space-x-2">
          {/* Edit button – requires change permission */}
          {canChange && (
            <button
              onClick={() => handleOpenEdit(value)}
              className="text-accent-600 hover:text-accent-700 transition-colors"
              title="Edit product"
            >
              <Edit size={16} />
            </button>
          )}
          {/* Delete button – requires delete permission */}
          {canDelete && (
            <button
              onClick={() => handleOpenDelete(value)}
              className="text-error-600 hover:text-error-700 transition-colors"
              title="Delete product"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
      width: 100,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-2">Manage loan products and their configurations</p>
        </div>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-900">All Products</h2>
            {/* Add Product button – requires create permission */}
            {canCreate && (
              <Button onClick={handleOpenCreate} className="bg-accent-600 hover:bg-accent-700">
                <Plus size={20} className="mr-2" />
                Add Product
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-lg text-gray-600">Loading products...</div>
            </div>
          ) : (
            <GenericTable
              data={products}
              columns={columns}
              rowKey={(row: Product) => row.id}
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
        title={editingProduct ? 'Edit Product' : 'Create New Product'}
        size="lg"
        isLoading={isSubmitting}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Product Name"
            name="product_name"
            type="text"
            value={formData.product_name}
            onChange={handleInputChange}
            error={formErrors.product_name}
            required
            placeholder="Enter product name"
          />

          <FormInput
            label="Product Description"
            name="product_description"
            type="textarea"
            value={formData.product_description}
            onChange={handleInputChange}
            error={formErrors.product_description}
            required
            placeholder="Enter product description"
            rows={4}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Product Term (Days)"
              name="product_term"
              type="number"
              value={formData.product_term}
              onChange={handleInputChange}
              error={formErrors.product_term}
              required
              placeholder="Enter product term"
            />

            <FormInput
              label="Default Days"
              name="default_days"
              type="number"
              value={formData.default_days}
              onChange={handleInputChange}
              error={formErrors.default_days}
              required
              placeholder="Enter default days"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>

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
              {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Product"
        size="sm"
        isLoading={isSubmitting}
      >
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete <strong>{deleteProduct?.product_name}</strong>? This action cannot be undone.
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
    </div>
  );
}