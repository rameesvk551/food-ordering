#!/bin/bash
# Extract the token
TOKEN=$(cat /home/ec2-user/marketting-os/marketing-os-server/.env | grep 'WHATSAPP_ACCESS_TOKEN=' | cut -d= -f2)

# Check if it exists in food-ordering .env
if grep -q 'WHATSAPP_ACCESS_TOKEN=' /home/ec2-user/food-ordering/server/.env; then
  # Replace existing line
  sed -i "s/^WHATSAPP_ACCESS_TOKEN=.*/WHATSAPP_ACCESS_TOKEN=$TOKEN/" /home/ec2-user/food-ordering/server/.env
else
  # Append line
  echo "WHATSAPP_ACCESS_TOKEN=$TOKEN" >> /home/ec2-user/food-ordering/server/.env
fi

echo "Env updated."

cd /home/ec2-user/food-ordering/server
npx tsc
echo "Typescript compiled."

pm2 restart food-ordering-server
echo "Server restarted."
