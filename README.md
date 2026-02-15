# AppChat

## Live Demo

After enabling GitHub Pages (Source: **GitHub Actions**) this project is available at:

- https://anasidrissi2005.github.io/AppChat/

If the site is not yet visible, wait for the `pages.yml` workflow to finish successfully in the Actions tab.

## New Features

- Optimistic sending state with pending/failure/retry for text and image messages.
- Typing indicator via Firestore `typing` collection.
- Group read receipts via Firestore `reads` collection.
- Image upload in chat via Firebase Storage.
- Settings page (`settings.html`) to update display name and avatar.

## Firebase setup notes

1. Enable **Firestore Database** and **Storage** in your Firebase project.
2. In Authentication, add your GitHub Pages domain to authorized domains.
3. Ensure `firebase-init.js` has a valid `storageBucket`.

## Firestore Security Rules (suggested)

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.roomId == "global"
        && (
          (request.resource.data.type == "text"
            && request.resource.data.text is string
            && request.resource.data.text.size() > 0)
          ||
          (request.resource.data.type == "image"
            && request.resource.data.imageUrl is string
            && request.resource.data.imageUrl.size() > 0
            && request.resource.data.imagePath is string
            && request.resource.data.imagePath.size() > 0)
        );
      allow update, delete: if request.auth != null
        && resource.data.uid == request.auth.uid;
    }

    match /typing/{typingId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null
        && request.resource.data.uid == request.auth.uid;
      allow delete: if false;
    }

    match /reads/{readId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null
        && request.resource.data.uid == request.auth.uid;
      allow delete: if false;
    }

    match /users/{userId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;
    }
  }
}
```

## Storage Rules (suggested)

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /chat_images/{roomId}/{uid}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    match /avatars/{uid}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Do not use publicly writable rules in production.
