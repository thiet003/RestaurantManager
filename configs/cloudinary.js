const cloudinary = require('cloudinary').v2;

cloudinary.config({ 
    cloud_name: 'dk6qkhn6d', 
    api_key: '114992927877217', 
    api_secret: 'DEMhxD-CP483X2YtXaiXlrIdh0E'
});

module.exports = cloudinary;