import React from "react";
import Image from "next/image";
import styles from "../CSS/createPost.module.css";
 
 const CreatePost = ({ user, onPost }) => {
   const [content, setContent] = React.useState("");
   const [posting, setPosting] = React.useState(false);
 
   const handleSubmit = async (e) => {
     e.preventDefault();
     if (!content.trim()) return;
     setPosting(true);
     try {
       await onPost(content);
       setContent("");
     } finally {
       setPosting(false);
     }
   };
 
   return (
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
       <div className={styles.actions}>
         <div className={styles.leftActions}>
           <button type="button" className={styles.liveVideo} disabled>
             <span className={styles.iconLive} /> Live video
           </button>
           <button type="button" className={styles.photoVideo} disabled>
             <span className={styles.iconPhoto} /> Photo/video
           </button>
           <button type="button" className={styles.feelingActivity} disabled>
             <span className={styles.iconFeeling} /> Feeling/activity
           </button>
         </div>
         <button type="submit" className={styles.submitPost} disabled={posting || !content.trim()}>
           Post
         </button>
       </div>
     </form>
   );
}

export default CreatePost;
