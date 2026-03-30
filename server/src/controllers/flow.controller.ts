import { Request, Response } from 'express';
import { decryptFlowRequest, encryptFlowResponse } from '../utils/flowEncryption';
import { Restaurant } from '../models/Restaurant';

export const handleFlowRequest = async (req: Request, res: Response) => {
  try {
    const { encrypted_flow_data, encrypted_aes_key, initial_vector } = req.body;

    if (!encrypted_flow_data || !encrypted_aes_key || !initial_vector) {
      console.error('Flow Request missing required encrypted payloads');
      res.status(400).send('Bad Request: Missing encryption payloads');
      return;
    }

    const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = decryptFlowRequest(
      encrypted_aes_key,
      encrypted_flow_data,
      initial_vector
    );
    
    // WhatsApp sends 'action', 'data', 'version', 'screen', 'flow_token'
    const { action, data, flow_token } = decryptedBody;
    
    // flow_token will be set when we send the initial flow message. We'll use it to pass the Restaurant ID.
    const restaurantId = flow_token;
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      console.error('Restaurant not found for flow_token:', flow_token);
      res.status(404).send('Restaurant not found');
      return;
    }

    let responsePayload: any = {};

    if (action === 'INIT') {
      // Return initial data: Categories List
      const categories = restaurant.menu.map(cat => ({
        id: cat._id?.toString() || cat.name,
        title: cat.name,
        // Since we don't have real images in DB yet, providing a placeholder.
        image: 'https://via.placeholder.com/150'
      }));

      responsePayload = {
        screen: 'CATEGORIES',
        data: {
          categories_list: categories
        }
      };
    } else if (action === 'data_exchange') {
      // User performed an action on the screen, e.g. selected a category
      if (data.action === 'select_category') {
        const categoryId = data.selected_category_id;
        const category = restaurant.menu.find(c => (c._id?.toString() || c.name) === categoryId);
        
        const items = category?.items.filter(i => i.isAvailable).map(item => ({
          id: item._id?.toString() || item.name,
          title: item.name,
          description: item.description || '',
          price: `₹${item.price}`,
          numeric_price: item.price,
          image: 'https://via.placeholder.com/150'
        })) || [];

        responsePayload = {
          screen: 'ITEMS',
          data: {
            category_name: category?.name || 'Items',
            items_list: items
          }
        };
      } else if (data.action === 'review_cart') {
        // Prepare cart review data
        // Here we could validate items and calculate totals server-side
        responsePayload = {
          screen: 'CART',
          data: {
            cart_items: data.cart_items || []
          }
        };
      }
    } else if (action === 'ping') {
      responsePayload = {
        data: {
          status: 'active'
        }
      };
    }

    const encryptedResponse = encryptFlowResponse(responsePayload, aesKeyBuffer, initialVectorBuffer);
    res.send(encryptedResponse);

  } catch (error) {
    console.error('Error handling flow request:', error);
    res.status(500).send('Internal Server Error');
  }
};
