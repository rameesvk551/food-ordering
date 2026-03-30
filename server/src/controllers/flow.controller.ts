import { Request, Response } from 'express';
import { decryptFlowRequest, encryptFlowResponse } from '../utils/flowEncryption';
import Restaurant from '../models/Restaurant';

export const handleFlowRequest = async (req: Request, res: Response) => {
  try {
    const { encrypted_flow_data, encrypted_aes_key, initial_vector } = req.body;

    if (!encrypted_flow_data || !encrypted_aes_key || !initial_vector) {
      return res.status(400).send('Missing encrypted payloads');
    }

    // Decrypt request
    const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = decryptFlowRequest(
      req.body,
      process.env.WHATSAPP_FLOW_PRIVATE_KEY || ''
    );

    const { action, screen, data, flow_token } = decryptedBody;

    // Handle Health Check
    if (action === 'ping') {
      const encryptedResponse = encryptFlowResponse(
        { data: { status: 'active' } },
        aesKeyBuffer,
        initialVectorBuffer
      );
      return res.send(encryptedResponse);
    }

    // Handle Data Exchange
    const restaurant = await Restaurant.findOne({ isActive: true }); // Using Wayo defaults for now
    if (!restaurant) {
      return res.status(404).send('Restaurant not found');
    }

    let responseData: any = {};

    if (action === 'INIT' || action === 'select_category') {
      const categories = restaurant.categories.map(cat => ({
        id: cat.name,
        title: cat.name,
        image: cat.image || 'https://via.placeholder.com/150'
      }));

      responseData = {
        screen: 'CATEGORIES',
        data: {
          categories_list: categories
        }
      };
    } else if (action === 'review_cart') {
      // Return selected items to CART screen
      responseData = {
        screen: 'CART',
        data: {
          cart_items: data.cart_items || []
        }
      };
    } else if (action === 'checkout') {
      // Final screen
      responseData = {
        screen: 'SUCCESS',
        data: {
          extension_message_response: {
            params: {
              flow_token,
              status: 'success'
            }
          }
        }
      };
    }

    const encryptedResponse = encryptFlowResponse(
      responseData,
      aesKeyBuffer,
      initialVectorBuffer
    );

    res.send(encryptedResponse);
  } catch (error) {
    console.error('Error handling flow request:', error);
    res.status(500).send('Internal Server Error');
  }
};
