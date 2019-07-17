FROM node:carbon

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Install frontend dependencies
RUN ["npm","run","bower"]

EXPOSE 8443
CMD ["npm","run","dev"]