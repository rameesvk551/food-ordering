import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Key, Eye, EyeOff, Smartphone, FileCheck, Users } from 'lucide-react';

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(true);
  
  // Registration State
  const [name, setName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register({ name, email, password, restaurantName });
      } else {
        await login(email, password);
      }
      navigate('/admin/orders');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl flex overflow-hidden min-h-[600px] animate-fade-in">
        
        {/* Left Pane - Dark Green Graphic */}
        <div className="hidden md:flex flex-col w-[45%] bg-gradient-to-b from-primary-600 to-primary-800 relative items-center justify-center p-12 overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white/5 blur-[100px] rounded-full mix-blend-overlay"></div>
          
          {/* Abstract Hero Graphic */}
          <div className="relative z-10 w-full max-w-[280px] aspect-square flex items-center justify-center">
            {/* Phone Base */}
            <div className="absolute w-[140px] h-[260px] bg-[#e2e8f0] rounded-3xl border-8 border-[#0f172a] shadow-2xl flex flex-col justify-between overflow-hidden">
              <div className="bg-white flex-1 p-3">
                <div className="w-full h-8 bg-blue-500/20 rounded mb-2"></div>
                <div className="w-3/4 h-3 bg-gray-200 rounded mb-1.5"></div>
                <div className="w-full h-3 bg-gray-200 rounded mb-1.5"></div>
                <div className="w-5/6 h-3 bg-gray-200 rounded mb-4"></div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded bg-gray-200"></div>
                  <div className="flex-1 rounded bg-gray-200"></div>
                </div>
              </div>
              <div className="h-4 bg-[#0f172a] w-full flex items-center justify-center">
                <div className="w-10 h-1 rounded-full bg-gray-600"></div>
              </div>
            </div>

            {/* Document Flap */}
            <div className="absolute -right-8 bottom-12 w-[160px] h-[200px] bg-white rounded-xl shadow-xl border border-gray-100 p-4 transform rotate-6 flex flex-col items-center">
              <h4 className="text-[10px] font-bold text-blue-600 tracking-wider uppercase mb-2">Contract</h4>
              <div className="w-full space-y-2 mb-4">
                <div className="h-1.5 bg-gray-200 rounded w-full"></div>
                <div className="h-1.5 bg-gray-200 rounded w-5/6"></div>
                <div className="h-1.5 bg-gray-200 rounded w-4/6"></div>
              </div>
              <FileCheck className="w-12 h-12 text-blue-500 mb-2 mt-auto" />
              <div className="w-8 h-8 rounded-full bg-blue-50 absolute -left-4 -top-4 flex items-center justify-center shadow-sm">
                <div className="w-4 h-4 bg-orange-400 rounded-sm"></div>
              </div>
            </div>

            {/* Floating People Icons */}
            <div className="absolute -left-6 bottom-20 bg-white p-3 rounded-full shadow-lg animate-bounce-in" style={{ animationDelay: '0.2s' }}>
              <Users className="w-8 h-8 text-primary-600" />
            </div>
            
             <div className="absolute right-0 top-10 bg-[#0f172a] p-3 rounded-xl shadow-lg">
              <Smartphone className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Right Pane - Form */}
        <div className="w-full md:w-[55%] p-8 md:p-14 lg:p-16 flex flex-col justify-center bg-white">
          <h2 className="text-[28px] font-bold text-text-primary mb-8 tracking-tight">
            {isRegister ? 'Registration' : 'Sign In'}
          </h2>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-gray-100">
                  <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md outline-none text-sm text-gray-700 placeholder-gray-400 transition-colors"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Business Name"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md outline-none text-sm text-gray-700 placeholder-gray-400 transition-colors"
                    required
                  />
                </div>

                <input
                  type="email"
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md outline-none text-sm text-gray-700 placeholder-gray-400 transition-colors"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative border border-gray-200 rounded-md bg-white hover:border-gray-300 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition-colors">
                    <select className="w-full px-4 py-3 outline-none text-sm text-gray-500 bg-transparent appearance-none cursor-pointer">
                      <option value="">Country</option>
                      <option value="in">India</option>
                      <option value="us">United States</option>
                      <option value="uk">United Kingdom</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                  <div className="relative border border-gray-200 rounded-md bg-white hover:border-gray-300 transition-colors">
                    <select className="w-full px-4 py-3 outline-none text-sm text-gray-500 bg-transparent appearance-none cursor-pointer">
                      <option value="">Business Category</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="cafe">Cafe / Bakery</option>
                      <option value="foodtruck">Food Truck</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>

                <input
                  type="url"
                  placeholder="Website URL (optional)"
                  className="w-full px-4 py-3 border border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md outline-none text-sm text-gray-700 placeholder-gray-400 transition-colors"
                />
              </>
            ) : (
              <input
                type="email"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-md outline-none text-sm text-gray-700 placeholder-gray-400 transition-colors"
                required
              />
            )}

            <div className="flex items-stretch border border-gray-200 rounded-md overflow-hidden bg-white focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition-colors">
              <div className="bg-primary-600 flex items-center justify-center px-4 w-[52px]">
                <Key className="w-4 h-4 text-white" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 px-4 py-3 outline-none text-sm text-gray-700 placeholder-gray-400"
                required
              />
              <div 
                className="bg-primary-600 hover:bg-primary-700 transition-colors flex items-center justify-center px-4 w-[52px] cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-white" />
                ) : (
                  <Eye className="w-4 h-4 text-white" />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-md transition-colors mt-6 cursor-pointer hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                isRegister ? 'Sign Up' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-medium text-gray-500">
            {isRegister ? (
              <>
                Already have an account?{' '}
                <span 
                  className="text-[#2a5952] font-bold cursor-pointer hover:underline"
                  onClick={() => { setIsRegister(false); setError(''); }}
                >
                  Sign in
                </span>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <span 
                  className="text-primary-600 font-bold cursor-pointer hover:underline"
                  onClick={() => { setIsRegister(true); setError(''); }}
                >
                  Sign up
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
