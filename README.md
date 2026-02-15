# AppChat

## Live Demo

After enabling GitHub Pages (Source: **GitHub Actions**) this project is available at:

- https://anasidrissi2005.github.io/AppChat/

If the site is not yet visible, wait for the `pages.yml` workflow to finish successfully in the Actions tab.

## Firestore Security Rules (Owner-only edit/delete)

To keep message editing/deletion safe, configure your Firestore rules so only the author of a message can update or delete it:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid;
      allow update, delete: if request.auth != null
        && resource.data.uid == request.auth.uid;
    }
  }
}
```

This prevents anonymous/public users from editing or deleting other users' messages.
