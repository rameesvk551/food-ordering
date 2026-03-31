import { Request, Response } from 'express';
import { decryptFlowRequest, encryptFlowResponse } from '../utils/flowEncryption';
import { Restaurant } from '../models/Restaurant';

export const handleFlowRequest = async (req: Request, res: Response) => {
  console.log('[Flow] Request arrived at endpoint.');
  try {
    const { encrypted_flow_data, encrypted_aes_key, initial_vector } = req.body;

    if (!encrypted_flow_data || !encrypted_aes_key || !initial_vector) {
      console.warn('[Flow] Missing encrypted payloads in request.');
      return res.status(400).send('Missing encrypted payloads');
    }

    // Decrypt request
    console.log('[Flow] Attempting decryption...');
    const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = decryptFlowRequest(
      encrypted_aes_key,
      encrypted_flow_data,
      initial_vector
    );

    console.log('[Flow] Decrypted Body Payload:', JSON.stringify(decryptedBody, null, 2));

    const { action, screen, data, flow_token } = decryptedBody;
    const normalizedAction = (action || 'INIT').toUpperCase();

    // Handle Health Check
    if (normalizedAction === 'PING') {
      console.log('[Flow] [PING] Handling health check.');
      const response = { data: { status: 'active' } };
      console.log('[Flow] [PING] Response:', JSON.stringify(response));
      const encryptedResponse = encryptFlowResponse(
        response,
        aesKeyBuffer,
        initialVectorBuffer
      );
      return res.send(encryptedResponse);
    }

    // Handle Data Exchange
    console.log(`[Flow] [${normalizedAction}] Screen: ${screen}, Token: ${flow_token}`);
    
    // Use flow_token to find restaurant if available
    let restaurant;
    if (flow_token && flow_token.match(/^[0-9a-fA-F]{24}$/)) {
      restaurant = await Restaurant.findById(flow_token);
      console.log(`[Flow] [Lookup] By ID: ${flow_token} -> ${restaurant ? restaurant.name : 'NOT FOUND'}`);
    } else {
      restaurant = await Restaurant.findOne({ isActive: true });
      console.log(`[Flow] [Lookup] By default (isActive:true) -> ${restaurant ? restaurant.name : 'NOT FOUND'}`);
    }

    if (!restaurant) {
      console.error(`[Flow] [Error] Restaurant lookup failed for token: ${flow_token}`);
      return res.status(404).send('Restaurant not found');
    }

    let responseData: any = {};

    if (normalizedAction === 'INIT' || normalizedAction === 'SELECT_CATEGORY') {
      console.log(`[Flow] [${normalizedAction}] Preparing categories menu...`);
      const categories = (restaurant.menu || []).map((cat: any) => ({
        id: cat._id?.toString() || cat.name,
        title: cat.name,
        image: cat.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=200'
      }));

      responseData = {
        screen: 'CATEGORIES',
        data: {
          categories_list: categories
        }
      };
      
      console.log(`[Flow] [${normalizedAction}] Response Data:`, JSON.stringify(responseData, null, 2));
      
      const encryptedResponse = encryptFlowResponse(
        responseData,
        aesKeyBuffer,
        initialVectorBuffer
      );
      console.log(`[Flow] [${normalizedAction}] Sending encrypted response.`);
      return res.send(encryptedResponse);
    } else if (normalizedAction === 'REVIEW_CART') {
      console.log('[Flow] [REVIEW_CART] Handling cart review.');
      responseData = {
        screen: 'CART',
        data: {
          cart_items: data?.cart_items || []
        }
      };
      console.log('[Flow] [REVIEW_CART] Response Data:', JSON.stringify(responseData, null, 2));
      const encryptedResponse = encryptFlowResponse(
        responseData,
        aesKeyBuffer,
        initialVectorBuffer
      );
      return res.send(encryptedResponse);
    } else if (normalizedAction === 'CHECKOUT') {
      console.log('[Flow] [CHECKOUT] Finalizing flow interaction.');
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
      console.log('[Flow] [CHECKOUT] Response Data:', JSON.stringify(responseData, null, 2));
      const encryptedResponse = encryptFlowResponse(
        responseData,
        aesKeyBuffer,
        initialVectorBuffer
      );
      return res.send(encryptedResponse);
    }

    console.warn(`[Flow] [Warning] Received unsupported action: ${normalizedAction}`);
    return res.status(400).send('Unsupported action');
  } catch (error: any) {
    console.error('[Flow] [CRITICAL ERROR]:', error);
    if (!res.headersSent) {
      return res.status(500).send('Internal Server Error');
    }
  }
};
