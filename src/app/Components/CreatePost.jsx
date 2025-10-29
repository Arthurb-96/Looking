import React from "react";
import Image from "next/image";
import MediaUploader from "./MediaUploader";
import styles from "../CSS/createPost.module.css";
 
const CreatePost = ({ user, onPost }) => {
   const [content, setContent] = React.useState("");
   const [posting, setPosting] = React.useState(false);
   const [showMediaUploader, setShowMediaUploader] = React.useState(false);
   const [selectedMedia, setSelectedMedia] = React.useState(null);
 
   const handleSubmit = async (e) => {
     e.preventDefault();
     if (!content.trim()) return;
     setPosting(true);
     try {
       await onPost(content, selectedMedia);
       setContent("");
       setSelectedMedia(null);
     } finally {
       setPosting(false);
     }
   };

   const handleMediaSelect = (media) => {
     setSelectedMedia(media);
   };
 
   return (
     <>
       <form className={styles.createPostWrapper} onSubmit={handleSubmit}>
         <div className={styles.topRow}>
           <Image
             src={user?.photoURL || "/profile-default.png"}
             alt="Profile Photo"
             width={40}
             height={40}
             className={styles.profilePhoto}
           />
           <input
             className={styles.postInput}
             type="text"
             value={content}
             onChange={e => setContent(e.target.value)}
             placeholder={`What's on your mind, ${user?.displayName || "User"}?`}
             disabled={posting}
           />
         </div>
         
         {/* Media Preview */}
         {selectedMedia && (
           <div className={styles.mediaPreview}>
             {selectedMedia.type === 'video' ? (
               <video 
                 src={selectedMedia.data} 
                 controls 
                 className={styles.previewVideo}
               >
                 Your browser does not support the video tag.
               </video>
             ) : (
               <img 
                 src={selectedMedia.data} 
                 alt="Canvas drawing" 
                 className={styles.previewImage}
               />
             )}
             <button 
               type="button" 
               onClick={() => setSelectedMedia(null)}
               className={styles.removeMediaBtn}
             >
               ×
             </button>
           </div>
         )}
         
         <div className={styles.actions}>
           <div className={styles.leftActions}>
             <button 
               type="button" 
               className={styles.photoVideo}
               onClick={() => setShowMediaUploader(true)}
             >
               <span className={styles.iconPhoto} /> 🎥 Media
             </button>
           </div>
           <button type="submit" className={styles.submitPost} disabled={posting || !content.trim()}>
             Post
           </button>
         </div>
       </form>

       {/* Media Uploader Modal */}
       {showMediaUploader && (
         <MediaUploader
           onMediaSelect={handleMediaSelect}
           onClose={() => setShowMediaUploader(false)}
         />
       )}
     </>
   );
};

export default CreatePost;

