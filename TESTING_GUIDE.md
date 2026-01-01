# Testing Guide - Firebase Migration

## Prerequisites

Ensure the following environment variables are set (they should be in GitHub Secrets):
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Your Firebase project API key
- `MAX_LUGARES` - Maximum number of passengers (default: 15)

## Test Cases

### Test 1: Login with Email and Password

**Objective**: Verify that the admin login works correctly without firebase-admin.

**Steps**:
1. Start the development server: `npm run dev`
2. Navigate to http://localhost:3000/admin-login
3. Enter the following credentials:
   - **Email**: `teste@teste.com`
   - **Password**: `teste1`
4. Click the "Entrar" button

**Expected Result**:
- The login should succeed without any Firebase errors
- User should be redirected to `/admin-panel`
- No console errors related to firebase-admin

**Previous Error** (Fixed):
- "firebase-admin não configurado"
- Various Firebase initialization errors

---

### Test 2: Create a Passagem (Reservation)

**Objective**: Verify that creating a reservation works correctly using Firebase client SDK.

**Steps**:
1. Navigate to http://localhost:3000 (home page)
2. Select a route:
   - Choose "📍 São João dos Patos → Teresina"
3. Select a date:
   - Choose any available date from the dropdown
4. Set passengers to 1
5. Click "Garantir minha vaga"
6. In the modal that appears, fill in:
   - **Nome completo**: `Clausemberg Rodrigues de Oliveira`
   - **CPF/CNPJ**: `10700418741`
   - **Email**: `clausembergrodrigues@gmail.com`
7. Click "Confirmar e Pagar"

**Expected Result**:
- The reservation should be created successfully
- A success message should appear: "Reserva(s) criada(s): 1"
- The data should be stored in Firestore without errors
- No console errors related to firebase-admin

**Previous Error** (Fixed):
- "firebase-admin não configurado (instale/configure FIREBASE_SA_BASE64)"
- Firestore operations failing

---

### Test 3: Verify CPF Validation

**Objective**: Ensure CPF validation still works correctly.

**Steps**:
1. Follow steps 1-5 from Test 2
2. In the modal, enter:
   - **Nome completo**: `Test User`
   - **CPF/CNPJ**: `12345678901` (invalid CPF)
   - **Email**: `test@test.com`
3. Click "Confirmar e Pagar"

**Expected Result**:
- An error message should appear: "CPF/CNPJ inválido"
- No reservation should be created

---

### Test 4: Database Operations in Admin Panel

**Objective**: Verify that admin database operations work with Firebase client SDK.

**Steps**:
1. Login to the admin panel (see Test 1)
2. Navigate to http://localhost:3000/admin-panel
3. Click "Limpar Banco de Dados"
4. Confirm the action in the dialog

**Expected Result**:
- The database should be cleared successfully
- Success message: "Banco de dados limpo com sucesso! X viagem(ns) deletada(s)."
- No console errors related to firebase-admin

---

### Test 5: Multiple Passengers

**Objective**: Verify that creating multiple reservations works correctly.

**Steps**:
1. Navigate to the home page
2. Select a route and date
3. Set passengers to 3
4. Click "Garantir minha vaga"
5. Fill in the customer details
6. Click "Confirmar e Pagar"

**Expected Result**:
- Three reservations should be created
- Success message: "Reserva(s) criada(s): 3"
- Each passenger should have a numbered name: "Name (1/3)", "Name (2/3)", "Name (3/3)"

---

## Console Verification

After each test, check the browser console and server logs for:

### What Should NOT Appear:
- ❌ "firebase-admin não configurado"
- ❌ "FIREBASE_SA_BASE64 não encontrada"
- ❌ Errors related to require('firebase-admin')
- ❌ "instale/configure FIREBASE_SA_BASE64"

### What SHOULD Appear:
- ✅ Normal Firebase client SDK initialization messages
- ✅ Successful Firestore operations
- ✅ No errors during authentication
- ✅ Clean database operations

---

## Known Behaviors

### Token Verification Note

The admin clear-database endpoint uses a simplified token verification approach since firebase-admin was removed. In production, you may want to implement a more robust server-side token verification using one of these approaches:

1. Use Firebase Auth REST API for token verification
2. Implement a custom authentication middleware
3. Use Firebase client SDK with proper security rules

The current implementation checks for token presence and basic format but does not perform full cryptographic verification.

---

## Troubleshooting

### Issue: Firebase API Key Not Found

**Symptom**: "Missing Firebase API key" warning in console

**Solution**: Ensure `NEXT_PUBLIC_FIREBASE_API_KEY` is set in your environment variables or `.env.local` file.

### Issue: MAX_LUGARES Error

**Symptom**: "ENV inválida: defina uma variável de ambiente numérica e positiva `MAX_LUGARES`"

**Solution**: Set `MAX_LUGARES=15` (or your desired value) in `.env.local` or environment variables.

### Issue: Firestore Rules

**Symptom**: Firestore operations fail with permission denied

**Solution**: Ensure your Firebase Firestore security rules allow the operations. For development, you might use:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /viagens/{viagemId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Success Criteria

All tests pass if:
- ✅ Login works without firebase-admin errors
- ✅ Reservations can be created successfully
- ✅ CPF validation works correctly
- ✅ Admin database operations work
- ✅ Multiple passenger reservations work
- ✅ No console errors related to firebase-admin
- ✅ All Firestore operations complete successfully

---

## Migration Summary

**Before**: 
- Required firebase-admin package
- Required FIREBASE_SA_BASE64 service account credentials
- Complex initialization with dynamic requires
- Potential build and deployment issues

**After**:
- Uses Firebase client SDK only
- Only requires NEXT_PUBLIC_FIREBASE_API_KEY
- Simpler, more maintainable code
- Better TypeScript support
- No build issues with dynamic imports
