import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';

const OrderSuccessPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="text-center animate-bounce-in">
        <div className="w-24 h-24 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-success">
          <CheckCircle className="w-12 h-12 text-accent-600" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Order Placed! 🎉</h1>
        <p className="text-text-secondary mb-1 max-w-sm">
          Your order has been received and is being prepared. We'll update you via WhatsApp.
        </p>
        <p className="text-text-muted text-sm mb-8">
          Sit back and relax — your food is on the way!
        </p>

        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Button
            onClick={() => navigate(`/${slug}`)}
            variant="primary"
            size="lg"
            className="w-full"
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Order More
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
