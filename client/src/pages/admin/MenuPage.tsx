import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { MenuCardSkeleton } from '../../components/ui/Skeleton';
import { Plus, Pencil, Trash2, FolderPlus, UtensilsCrossed, Upload, X } from 'lucide-react';
import { uploadImage } from '../../services/api';

interface PortionOption {
  id: string;
  name: string;
  price: number;
  description?: string;
  isDefault?: boolean;
}

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  isAvailable: boolean;
  portionOptions?: PortionOption[];
}

interface MenuCategory {
  _id: string;
  name: string;
  image?: string;
  items: MenuItem[];
}

const createDefaultPortionOptions = (basePrice = 0): PortionOption[] => {
  const safeBasePrice = Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 0;
  return [
    {
      id: 'quarter',
      name: 'Quarter',
      price: safeBasePrice > 0 ? Math.max(1, Math.round(safeBasePrice * 0.65)) : 0,
      description: 'Light portion',
      isDefault: false,
    },
    {
      id: 'half',
      name: 'Half',
      price: safeBasePrice,
      description: 'Most popular',
      isDefault: true,
    },
    {
      id: 'full',
      name: 'Full',
      price: safeBasePrice > 0 ? Math.max(1, Math.round(safeBasePrice * 1.8)) : 0,
      description: 'Best for sharing',
      isDefault: false,
    },
  ];
};

const normalizeItemImages = (item: MenuItem): string[] => {
  if (Array.isArray(item.images) && item.images.length > 0) {
    return item.images;
  }

  return item.image ? [item.image] : [];
};

const MenuPage = () => {
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryImage, setCategoryImage] = useState('');
  const [categoryImageUrlInput, setCategoryImageUrlInput] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [itemForm, setItemForm] = useState({
    name: '', description: '', price: '', images: [] as string[], portionOptions: createDefaultPortionOptions(0),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false);
  const { showToast } = useToast();

  const fetchMenu = async () => {
    try {
      const res = await api.get('/menu');
      setMenu(res.data.menu);
    } catch {
      showToast('Failed to fetch menu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMenu(); }, []);

  const addCategory = async () => {
    if (!categoryName.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/menu/categories', {
        name: categoryName,
        image: categoryImage,
      });
      setMenu(res.data.menu);
      setCategoryName('');
      setCategoryImage('');
      setCategoryImageUrlInput('');
      setShowCategoryModal(false);
      showToast('Category added!');
    } catch {
      showToast('Failed to add category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const res = await api.delete(`/menu/categories/${categoryId}`);
      setMenu(res.data.menu);
      showToast('Category deleted');
    } catch {
      showToast('Failed to delete category', 'error');
    }
  };

  const openAddItem = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setEditingItem(null);
    setImageUrlInput('');
    setItemForm({
      name: '',
      description: '',
      price: '',
      images: [],
      portionOptions: createDefaultPortionOptions(0),
    });
    setShowItemModal(true);
  };

  const openEditItem = (categoryId: string, item: MenuItem) => {
    setSelectedCategoryId(categoryId);
    setEditingItem(item);
    const basePrice = item.price || 0;
    const existingOptions = Array.isArray(item.portionOptions) && item.portionOptions.length > 0
      ? item.portionOptions
      : createDefaultPortionOptions(basePrice);

    setImageUrlInput('');
    setItemForm({
      name: item.name,
      description: item.description,
      price: basePrice.toString(),
      images: normalizeItemImages(item),
      portionOptions: existingOptions,
    });
    setShowItemModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        try {
          const { url } = await uploadImage(file);
          if (url) {
            uploadedUrls.push(url);
          }
        } catch {
          // Continue uploading remaining files even if one fails.
        }
      }

      if (uploadedUrls.length > 0) {
        setItemForm((prev) => {
          const uniqueNewUrls = uploadedUrls.filter((url) => !prev.images.includes(url));
          return { ...prev, images: [...prev.images, ...uniqueNewUrls] };
        });

        showToast(uploadedUrls.length === 1 ? 'Image uploaded successfully' : `${uploadedUrls.length} images uploaded successfully`);
      }

      if (uploadedUrls.length < files.length) {
        showToast(`${files.length - uploadedUrls.length} image upload failed`, 'error');
      }
    } catch {
      showToast('Image upload failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCategoryImage(true);
    try {
      const { url } = await uploadImage(file);
      setCategoryImage(url);
      setCategoryImageUrlInput('');
      showToast('Category image uploaded successfully');
    } catch {
      showToast('Category image upload failed', 'error');
    } finally {
      setUploadingCategoryImage(false);
    }
  };

  const addCategoryImageFromUrl = () => {
    const url = categoryImageUrlInput.trim();
    if (!url) {
      return;
    }
    setCategoryImage(url);
  };

  const saveItem = async () => {
    if (!itemForm.name || !itemForm.price) return;
    setSaving(true);
    try {
      const basePrice = parseFloat(itemForm.price);
      const cleanedPortions = itemForm.portionOptions
        .map((option, index) => ({
          id: option.id?.trim() || option.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `option-${index + 1}`,
          name: option.name.trim(),
          price: Number(option.price),
          description: option.description?.trim() || '',
          isDefault: Boolean(option.isDefault),
        }))
        .filter((option) => option.name && Number.isFinite(option.price) && option.price >= 0);

      if (cleanedPortions.length > 0 && !cleanedPortions.some((option) => option.isDefault)) {
        cleanedPortions[0].isDefault = true;
      }

      const payload = {
        name: itemForm.name,
        description: itemForm.description,
        price: basePrice,
        images: itemForm.images,
        image: itemForm.images[0] || '',
        portionOptions: cleanedPortions,
      };

      let res;
      if (editingItem) {
        res = await api.put(`/menu/categories/${selectedCategoryId}/items/${editingItem._id}`, payload);
      } else {
        res = await api.post(`/menu/categories/${selectedCategoryId}/items`, payload);
      }
      setMenu(res.data.menu);
      setShowItemModal(false);
      showToast(editingItem ? 'Item updated!' : 'Item added!');
    } catch {
      showToast('Failed to save item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addImageFromUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) {
      return;
    }

    setItemForm((prev) => {
      if (prev.images.includes(url)) {
        return prev;
      }

      return { ...prev, images: [...prev.images, url] };
    });
    setImageUrlInput('');
  };

  const removeImage = (index: number) => {
    setItemForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const setPrimaryImage = (index: number) => {
    setItemForm((prev) => {
      const selected = prev.images[index];
      if (!selected) {
        return prev;
      }

      const nextImages = [selected, ...prev.images.filter((_, imageIndex) => imageIndex !== index)];
      return { ...prev, images: nextImages };
    });
  };

  const addPortionOption = () => {
    setItemForm((prev) => ({
      ...prev,
      portionOptions: [
        ...prev.portionOptions,
        {
          id: `option-${prev.portionOptions.length + 1}`,
          name: '',
          price: Number(prev.price) || 0,
          description: '',
          isDefault: prev.portionOptions.length === 0,
        },
      ],
    }));
  };

  const updatePortionOption = (index: number, field: keyof PortionOption, value: string | number | boolean) => {
    setItemForm((prev) => ({
      ...prev,
      portionOptions: prev.portionOptions.map((option, optionIndex) => {
        if (optionIndex !== index) {
          return option;
        }

        return { ...option, [field]: value };
      }),
    }));
  };

  const setDefaultPortionOption = (index: number) => {
    setItemForm((prev) => ({
      ...prev,
      portionOptions: prev.portionOptions.map((option, optionIndex) => ({
        ...option,
        isDefault: optionIndex === index,
      })),
    }));
  };

  const removePortionOption = (index: number) => {
    setItemForm((prev) => {
      const nextOptions = prev.portionOptions.filter((_, optionIndex) => optionIndex !== index);
      if (nextOptions.length > 0 && !nextOptions.some((option) => option.isDefault)) {
        nextOptions[0] = { ...nextOptions[0], isDefault: true };
      }
      return {
        ...prev,
        portionOptions: nextOptions,
      };
    });
  };

  const deleteItem = async (categoryId: string, itemId: string) => {
    try {
      const res = await api.delete(`/menu/categories/${categoryId}/items/${itemId}`);
      setMenu(res.data.menu);
      showToast('Item deleted');
    } catch {
      showToast('Failed to delete item', 'error');
    }
  };

  const toggleAvailability = async (categoryId: string, item: MenuItem) => {
    try {
      const res = await api.put(`/menu/categories/${categoryId}/items/${item._id}`, {
        isAvailable: !item.isAvailable,
      });
      setMenu(res.data.menu);
    } catch {
      showToast('Failed to update item', 'error');
    }
  };

  return (
    <div className="animate-fade-in px-2 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">Menu Management</h1>
          <p className="text-text-secondary text-xs md:text-sm mt-1">Organize categories and items</p>
        </div>
        <Button 
          onClick={() => setShowCategoryModal(true)} 
          icon={<FolderPlus className="w-4 h-4" />}
          className="w-full sm:w-auto justify-center"
        >
          Add Category
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <MenuCardSkeleton key={i} />)}
        </div>
      ) : menu.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-border">
          <UtensilsCrossed className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No menu items yet</h3>
          <p className="text-text-secondary text-sm mb-4">Start by adding a category</p>
          <Button onClick={() => setShowCategoryModal(true)}>Add Category</Button>
        </div>
      ) : (
        <div className="space-y-8">
          {menu.map((category) => (
            <div key={category._id}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-primary-500 rounded-full" />
                  {category.name}
                  <span className="text-sm font-normal text-text-muted">
                    ({category.items.length} items)
                  </span>
                </h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openAddItem(category._id)}
                    icon={<Plus className="w-4 h-4" />}>
                    Add Item
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteCategory(category._id)}
                    icon={<Trash2 className="w-4 h-4 text-red-400" />}>
                    {''}
                  </Button>
                </div>
              </div>

              {category.items.length > 0 ? (
                <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {category.items.map((item) => (
                    <div
                      key={item._id}
                      className={`bg-white rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${
                        !item.isAvailable ? 'opacity-60' : ''
                      }`}
                    >
                      {normalizeItemImages(item)[0] ? (
                        <img src={normalizeItemImages(item)[0]} alt={item.name} className="w-full h-36 object-cover" />
                      ) : (
                        <div className="w-full h-36 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                          <UtensilsCrossed className="w-10 h-10 text-primary-300" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-text-primary">{item.name}</h3>
                          <span className="text-lg font-bold text-primary-600">₹{item.price}</span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-text-muted mb-3 line-clamp-2">{item.description}</p>
                        )}
                        {Array.isArray(item.portionOptions) && item.portionOptions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {item.portionOptions.slice(0, 3).map((option) => (
                              <span key={option.id} className="text-[11px] px-2 py-1 rounded-full bg-primary-50 text-primary-700">
                                {option.name}: ₹{option.price}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <button
                            onClick={() => toggleAvailability(category._id, item)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                              item.isAvailable
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {item.isAvailable ? 'Available' : 'Unavailable'}
                          </button>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEditItem(category._id, item)}
                              className="p-2 rounded-lg hover:bg-gray-100 text-text-muted transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteItem(category._id, item._id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                  <p className="text-text-muted text-sm">No items in this category</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setCategoryName('');
          setCategoryImage('');
          setCategoryImageUrlInput('');
        }}
        title="Add Category"
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g. Starters, Main Course, Beverages"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          />
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Category Image
            </label>
            <div className="space-y-3">
              {categoryImage ? (
                <div className="relative group">
                  <img
                    src={categoryImage}
                    alt="Category preview"
                    className="w-full h-40 object-cover rounded-xl border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => setCategoryImage('')}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploadingCategoryImage ? (
                      <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-3" />
                    ) : (
                      <Upload className="w-8 h-8 text-primary-400 mb-3" />
                    )}
                    <p className="text-sm text-text-secondary">
                      {uploadingCategoryImage ? 'Uploading...' : 'Click to upload image'}
                    </p>
                    <p className="text-xs text-text-muted mt-1">PNG, JPG or WEBP (Max 5MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleCategoryImageUpload}
                    disabled={uploadingCategoryImage}
                  />
                </label>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Or paste category image URL"
                    value={categoryImageUrlInput}
                    onChange={(e) => setCategoryImageUrlInput(e.target.value)}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={addCategoryImageFromUrl}>Add</Button>
              </div>
            </div>
          </div>
          <Button onClick={addCategory} loading={saving} className="w-full">
            Add Category
          </Button>
        </div>
      </Modal>

      {/* Add/Edit Item Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItem ? 'Edit Item' : 'Add Item'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Item Name"
            placeholder="e.g. Butter Chicken"
            value={itemForm.name}
            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
          />
          <Input
            label="Description"
            placeholder="Rich and creamy..."
            value={itemForm.description}
            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
          />
          <Input
            label="Price (₹)"
            type="number"
            placeholder="299"
            value={itemForm.price}
            onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
          />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Portion Pricing
              </label>
              <Button type="button" size="sm" variant="secondary" onClick={addPortionOption}>
                Add Option
              </Button>
            </div>

            {itemForm.portionOptions.length === 0 ? (
              <div className="text-xs text-text-muted bg-gray-50 border border-dashed border-border rounded-xl p-3">
                Add options like Quarter, Half, Full with separate prices.
              </div>
            ) : (
              <div className="space-y-2">
                {itemForm.portionOptions.map((option, index) => (
                  <div key={`${option.id}-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 border border-border rounded-xl bg-gray-50">
                    <div className="md:col-span-3">
                      <Input
                        placeholder="Option name"
                        value={option.name}
                        onChange={(e) => updatePortionOption(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Input
                        type="number"
                        placeholder="Price"
                        value={option.price}
                        onChange={(e) => updatePortionOption(index, 'price', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="md:col-span-4">
                      <Input
                        placeholder="Description"
                        value={option.description || ''}
                        onChange={(e) => updatePortionOption(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setDefaultPortionOption(index)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border cursor-pointer ${
                          option.isDefault
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-white text-text-muted border-border'
                        }`}
                      >
                        Default
                      </button>
                      <button
                        type="button"
                        onClick={() => removePortionOption(index)}
                        className="p-2 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Item Images
            </label>
            <div className="space-y-3">
              {itemForm.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {itemForm.images.map((image, index) => (
                    <div key={`${image}-${index}`} className="relative group">
                      <img
                        src={image}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-28 object-cover rounded-xl border border-border"
                      />
                      <div className="absolute left-2 top-2 text-[10px] px-2 py-0.5 rounded-full bg-black/60 text-white">
                        {index === 0 ? 'Primary' : `Image ${index + 1}`}
                      </div>
                      <div className="absolute right-2 top-2 flex gap-1">
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => setPrimaryImage(index)}
                            className="p-1.5 bg-white/90 text-[#1f2937] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Set as primary"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploading ? (
                    <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-3" />
                  ) : (
                    <Upload className="w-8 h-8 text-primary-400 mb-3" />
                  )}
                  <p className="text-sm text-text-secondary">
                    {uploading ? 'Uploading...' : 'Click to upload image(s)'}
                  </p>
                  <p className="text-xs text-text-muted mt-1">Upload one or more images (PNG, JPG or WEBP)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Paste image URL and click Add"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={addImageFromUrl}>Add</Button>
              </div>
            </div>
          </div>
          <Button onClick={saveItem} loading={saving} className="w-full">
            {editingItem ? 'Update Item' : 'Add Item'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MenuPage;
