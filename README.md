# AppChat

## Live Demo

After enabling GitHub Pages (Source: **GitHub Actions**) this project is available at:

- https://anasidrissi2005.github.io/AppChat/

If the site is not yet visible, wait for the `pages.yml` workflow to finish successfully in the Actions tab.

## Notes

- Images were removed. AppChat is now a **text-only chat**.
- Supported features: text messages, optimistic sending, edit/delete (owner only), typing indicator, seen receipts, and display-name settings.
- Chat startup waits for Auth readiness and can fallback to anonymous sign-in.

## Auth setup note

- Enable **Anonymous Auth** in Firebase Authentication if you want unauthenticated visitors to enter chat automatically.

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
        && request.resource.data.type == "text"
        && request.resource.data.text is string
        && request.resource.data.text.size() > 0;
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
