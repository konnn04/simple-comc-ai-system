import cloudinary
import cloudinary.uploader

def upload_image(image):
    upload_result = cloudinary.uploader.upload(image)
    return upload_result.get('secure_url')
