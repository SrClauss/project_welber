# Migration from firebase-admin to Firebase Client SDK

## Changes Made

This migration removes the dependency on `firebase-admin` and uses the Firebase client SDK for all Firestore operations.

### Key Changes:

1. **Removed firebase-admin dependency** from `package.json`
2. **Created new Firestore client** (`lib/firestoreClient.ts`) that uses Firebase client SDK
3. **Updated viagemService.ts** to use the new Firestore client with proper TypeScript types
4. **Updated admin clear-database route** to use Firebase client SDK
5. **Removed firebaseAdmin.ts** as it's no longer needed

### Benefits:

- **Simpler setup**: No need for FIREBASE_SA_BASE64 service account credentials
- **Single SDK**: Uses the same Firebase SDK for both authentication and Firestore
- **Better compatibility**: Works seamlessly in client-side and server-side environments
- **No build issues**: Eliminates the need for dynamic requires and complex initialization

## Environment Variables Required

Only these environment variables are now required:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
MAX_LUGARES=15
```

## Testing Instructions

### 1. Test Login

1. Navigate to `/admin-login`
2. Enter credentials:
   - Email: `teste@teste.com`
   - Password: `teste1`
3. Click "Entrar"
4. Should redirect to `/admin-panel` on successful login

### 2. Test Creating a Passagem (Reservation)

1. Navigate to the home page `/`
2. Select a route: "São João dos Patos → Teresina" or "Teresina → São João dos Patos"
3. Select a date from the available options
4. Select number of passengers (e.g., 1)
5. Click "Garantir minha vaga"
6. Fill in the modal with:
   - Nome: `Clausemberg Rodrigues de Oliveira`
   - CPF/CNPJ: `10700418741`
   - Email: `clausembergrodrigues@gmail.com`
7. Click "Confirmar e Pagar"
8. Should see a success message with the reservation created

### 3. Verify Database Operations

The following operations should work without errors:
- Creating new viagens (trips) in Firestore
- Adding passagens (reservations) to existing viagens
- Querying viagens by date and route
- Clearing database from admin panel

## Previous Errors Fixed

### Error 1: firebase-admin not configured
**Before**: When trying to create a passagem, the system would throw "firebase-admin não configurado (instale/configure FIREBASE_SA_BASE64)"

**After**: Now uses Firebase client SDK which doesn't require FIREBASE_SA_BASE64

### Error 2: Firebase login errors
**Before**: Login attempts might fail due to Firebase authentication issues related to admin SDK

**After**: Uses consistent Firebase client SDK for authentication

## Technical Details

### Firestore Operations Migration

| Operation | Before (firebase-admin) | After (Firebase Client SDK) |
|-----------|------------------------|----------------------------|
| Get document | `firestore.collection("x").doc(id).get()` | `getDoc(doc(db, "x", id))` |
| Query collection | `firestore.collection("x").where(...).get()` | `getDocs(query(collection(db, "x"), where(...)))` |
| Transaction | `firestore.runTransaction(async (tx) => ...)` | `runTransaction(db, async (tx) => ...)` |
| Batch write | `firestore.batch()` | `writeBatch(db)` |
| Set document | `ref.set(data)` | `setDoc(ref, data)` |

### Type Safety Improvements

The new implementation uses proper TypeScript types from `firebase/firestore`:
- `Firestore` - Database instance type
- `DocumentReference` - Document reference type
- All operations are properly typed

## Notes

- The Firebase client SDK can be used in both client and server components
- All API routes continue to work as expected
- The authentication flow remains unchanged
- No changes required to the user-facing UI
