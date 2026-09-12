package com.brr.medi_pcr.Service; // Adjust package as needed

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FileUploadService {

    // Spring will automatically inject your existing Cloudinary bean here
    private final Cloudinary cloudinary; 

//    public String uploadProfilePicture(MultipartFile file) {
//        try {
//            // You can add options here, like putting images in a specific folder
//            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
//                    "folder", "profile_pictures" // Organizes files in your Cloudinary dashboard
//            ));
//
//            return uploadResult.get("secure_url").toString();
//
//        } catch (IOException e) {
//            throw new RuntimeException("Failed to upload profile picture", e);
//        }
//    }

    public String uploadProfilePicture(MultipartFile file) {
        try {
            // 2. We call cloudinary.uploader() here!
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", "profile_pictures"
            ));

            return uploadResult.get("secure_url").toString();

        } catch (IOException e) {
            throw new RuntimeException("Failed to upload profile picture", e);
        }
    }
    // You can add more methods here later, like uploadDocument(), deleteFile(), etc.
}