import { useState, useEffect } from 'react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
  Save,
  Upload,
  X,
  MapPin,
  Phone,
  Clock,
  ImagePlus,
  Trash2,
} from 'lucide-react';
import { uploadImage } from '../../services/api';

interface RestaurantSettings {
  _id?: string;
  name: string;
  description: string;
  phoneNumber: string;
  email?: string;
  images?: string[];
  logo?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  cuisineTypes: string[];
  businessHours: {
    [key: string]: {
      open: string;
      close: string;
      isClosed: boolean;
    };
  };
  minDeliveryTime: number;
  maxDeliveryTime: number;
  minOrderValue: number;
  deliveryCharges: number;
  isActive: boolean;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SettingsPage = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [settings, setSettings] = useState<RestaurantSettings>({
    name: '',
    description: '',
    phoneNumber: '',
    email: '',
    images: [],
    logo: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: 0,
    longitude: 0,
    cuisineTypes: [],
    businessHours: {
      Monday: { open: '09:00', close: '23:00', isClosed: false },
      Tuesday: { open: '09:00', close: '23:00', isClosed: false },
      Wednesday: { open: '09:00', close: '23:00', isClosed: false },
      Thursday: { open: '09:00', close: '23:00', isClosed: false },
      Friday: { open: '09:00', close: '23:00', isClosed: false },
      Saturday: { open: '10:00', close: '00:00', isClosed: false },
      Sunday: { open: '10:00', close: '23:00', isClosed: false },
    },
    minDeliveryTime: 30,
    maxDeliveryTime: 60,
    minOrderValue: 0,
    deliveryCharges: 0,
    isActive: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/restaurant/settings');
      setSettings(response.data);
    } catch (error) {
      showToast('Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBasicInfoChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLocationChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBusinessHoursChange = (day: string, field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value,
        },
      },
    }));
  };

  const handleToggleClosed = (day: string) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          isClosed: !prev.businessHours[day].isClosed,
        },
      },
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    try {
      setUploadingImage(true);
      for (const file of Array.from(files)) {
        const { url } = await uploadImage(file);
        setSettings(prev => ({
          ...prev,
          images: [...(prev.images || []), url],
        }));
      }
      showToast('Images uploaded successfully', 'success');
      setIsImageModalOpen(false);
    } catch (error) {
      showToast('Error uploading images', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const { url } = await uploadImage(file);
      setSettings(prev => ({
        ...prev,
        logo: url,
      }));
      showToast('Logo uploaded successfully', 'success');
    } catch (error) {
      showToast('Error uploading logo', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setSettings(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || [],
    }));
  };

  const addCuisineType = (type: string) => {
    if (type && !settings.cuisineTypes.includes(type)) {
      setSettings(prev => ({
        ...prev,
        cuisineTypes: [...prev.cuisineTypes, type],
      }));
    }
  };

  const removeCuisineType = (type: string) => {
    setSettings(prev => ({
      ...prev,
      cuisineTypes: prev.cuisineTypes.filter(c => c !== type),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/restaurant/settings', settings);
      showToast('Settings saved successfully', 'success');
    } catch (error) {
      showToast('Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Restaurant Settings</h1>
        <p className="text-gray-600 mt-2">Manage your restaurant details, images, location, and hours</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap border-b border-gray-200">
        {[
          { id: 'basic', label: 'Basic Info', icon: '📋' },
          { id: 'images', label: 'Images & Logo', icon: '🖼️' },
          { id: 'location', label: 'Location', icon: '📍' },
          { id: 'hours', label: 'Business Hours', icon: '⏰' },
          { id: 'delivery', label: 'Delivery', icon: '🚚' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 md:p-8">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant Name</label>
              <Input
                type="text"
                value={settings.name}
                onChange={(e) => handleBasicInfoChange('name', e.target.value)}
                placeholder="Enter restaurant name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={settings.description}
                onChange={(e) => handleBasicInfoChange('description', e.target.value)}
                placeholder="Enter restaurant description"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="inline mr-2 h-4 w-4" /> Phone Number
                </label>
                <Input
                  type="tel"
                  value={settings.phoneNumber}
                  onChange={(e) => handleBasicInfoChange('phoneNumber', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <Input
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => handleBasicInfoChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Cuisine Types</label>
              <div className="flex gap-2 mb-3">
                <Input
                  type="text"
                  placeholder="e.g., Pizza, Indian, Chinese"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addCuisineType((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <Button
                  onClick={(e: any) => {
                    addCuisineType(e.target.previousElementSibling?.value || '');
                    e.target.previousElementSibling.value = '';
                  }}
                  className="whitespace-nowrap"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.cuisineTypes.map((type) => (
                  <div
                    key={type}
                    className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full flex items-center gap-2"
                  >
                    {type}
                    <button
                      onClick={() => removeCuisineType(type)}
                      className="hover:text-primary-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Images Tab */}
        {activeTab === 'images' && (
          <div className="space-y-8">
            {/* Logo Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Logo</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                {settings.logo ? (
                  <div className="flex items-center gap-6">
                    <img
                      src={settings.logo}
                      alt="Logo"
                      className="h-32 w-32 object-cover rounded-lg"
                    />
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <div className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                          Change Logo
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </label>
                      <Button
                        onClick={() => setSettings(prev => ({ ...prev, logo: '' }))}
                        variant="danger"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-600 transition">
                      <ImagePlus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">Click to upload logo</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Gallery Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Restaurant Gallery</h3>
                <Button
                  onClick={() => setIsImageModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <ImagePlus className="h-4 w-4" />
                  Add Images
                </Button>
              </div>

              {settings.images && settings.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {settings.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Gallery ${index + 1}`}
                        className="h-32 w-full object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">No images added yet</div>
              )}
            </div>

            {/* Image Upload Modal */}
            <Modal
              isOpen={isImageModalOpen}
              title="Upload Images"
              onClose={() => setIsImageModalOpen(false)}
            >
              <label className="cursor-pointer block">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-600 transition">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setIsImageModalOpen(false)}>
                  Done
                </Button>
              </div>
            </Modal>
          </div>
        )}

        {/* Location Tab */}
        {activeTab === 'location' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline mr-2 h-4 w-4" />
                Address
              </label>
              <Input
                type="text"
                value={settings.address}
                onChange={(e) => handleLocationChange('address', e.target.value)}
                placeholder="Enter street address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <Input
                  type="text"
                  value={settings.city}
                  onChange={(e) => handleLocationChange('city', e.target.value)}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <Input
                  type="text"
                  value={settings.state}
                  onChange={(e) => handleLocationChange('state', e.target.value)}
                  placeholder="Enter state"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                <Input
                  type="text"
                  value={settings.zipCode}
                  onChange={(e) => handleLocationChange('zipCode', e.target.value)}
                  placeholder="Enter zip code"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                <Input
                  type="number"
                  step="0.000001"
                  value={settings.latitude}
                  onChange={(e) => handleLocationChange('latitude', parseFloat(e.target.value))}
                  placeholder="Enter latitude"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                <Input
                  type="number"
                  step="0.000001"
                  value={settings.longitude}
                  onChange={(e) => handleLocationChange('longitude', parseFloat(e.target.value))}
                  placeholder="Enter longitude"
                />
              </div>
            </div>

            {/* Google Maps Embed */}
            {settings.latitude && settings.longitude && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Location Preview</h3>
                <iframe
                  width="100%"
                  height="400"
                  style={{ border: 0, borderRadius: '8px' }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD84uWcVMuDQSvDMpTXL6eM_SrFwE5UyKI&q=${settings.latitude},${settings.longitude}`}
                />
              </div>
            )}
          </div>
        )}

        {/* Business Hours Tab */}
        {activeTab === 'hours' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5" /> Set Business Hours
            </h3>
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className="w-24 font-medium text-gray-700">{day}</div>
                {settings.businessHours[day].isClosed ? (
                  <div className="flex-1 text-gray-600">Closed</div>
                ) : (
                  <div className="flex-1 flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Opening Time</label>
                      <Input
                        type="time"
                        value={settings.businessHours[day].open}
                        onChange={(e) =>
                          handleBusinessHoursChange(day, 'open', e.target.value)
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Closing Time</label>
                      <Input
                        type="time"
                        value={settings.businessHours[day].close}
                        onChange={(e) =>
                          handleBusinessHoursChange(day, 'close', e.target.value)
                        }
                      />
                    </div>
                  </div>
                )}
                <label className="flex items-center gap-2 text-gray-600">
                  <input
                    type="checkbox"
                    checked={settings.businessHours[day].isClosed}
                    onChange={() => handleToggleClosed(day)}
                    className="rounded"
                  />
                  Closed
                </label>
              </div>
            ))}
          </div>
        )}

        {/* Delivery Tab */}
        {activeTab === 'delivery' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Delivery Time (minutes)
                </label>
                <Input
                  type="number"
                  value={settings.minDeliveryTime}
                  onChange={(e) =>
                    handleBasicInfoChange('minDeliveryTime', parseInt(e.target.value))
                  }
                  placeholder="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Delivery Time (minutes)
                </label>
                <Input
                  type="number"
                  value={settings.maxDeliveryTime}
                  onChange={(e) =>
                    handleBasicInfoChange('maxDeliveryTime', parseInt(e.target.value))
                  }
                  placeholder="60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Order Value
                </label>
                <Input
                  type="number"
                  value={settings.minOrderValue}
                  onChange={(e) =>
                    handleBasicInfoChange('minOrderValue', parseFloat(e.target.value))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Charges
                </label>
                <Input
                  type="number"
                  value={settings.deliveryCharges}
                  onChange={(e) =>
                    handleBasicInfoChange('deliveryCharges', parseFloat(e.target.value))
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
