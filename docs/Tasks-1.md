## Tasks

### 1. Add Audience Group Management Sidebar Item
**Objective**: Add a new sidebar item labeled "Audience Groups" to navigate to a management page.

#### Steps
1. **Update Navigation Component** (`frontend/src/components/Navigation.tsx`):
   - Add "Audience Groups" to the `navigation` array
   - Ensure the active state logic works for the new item.

#### Deliverables
- Updated `Navigation.tsx` with "Audience Groups" item.

---

### 2. Create Audience Groups Management Page
**Objective**: Build a page at `/audience-groups` to create, edit, and delete audience groups by selecting contacts and groups from WhatsApp.

#### Steps
1. **Create New Page** (`frontend/src/app/audience-groups/page.tsx`):
   - Implement a form to manage audience groups

---

### 3. Update Contacts & Groups Page
**Objective**: Enhance the existing "Contacts & Groups" page to integrate with audience groups.

#### Steps
1. **Modify Page** (`frontend/src/app/contacts-groups/page.tsx` - create if not exists):
   - Add a button or link to navigate to "Audience Groups"
