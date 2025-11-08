# Authentication & Storage

## Auth System (Supabase)

### Registration

```typescript
async function signup(username: string, password: string, birthdate: string) {
  // 1. Create Supabase auth user
  const { data: authUser, error } = await supabase.auth.signUp({
    email: `${username}@temp.local`, // Fake email for Supabase compatibility
    password
  });

  // 2. Create user record
  const age = calculateAge(birthdate);
  const requiresParent = age < 13;

  await supabase.from('users').insert({
    id: authUser.user.id,
    username,
    password_hash: authUser.user.encrypted_password,
    birthdate,
    parent_email: requiresParent ? null : undefined,
    parent_verified: false
  });

  // 3. If under 13, prompt for parent email
  if (requiresParent) {
    return { success: true, requiresParentEmail: true };
  }

  return { success: true };
}
```

### COPPA Compliance

**Under-13 users:**
- Require parent email on signup
- Send verification email to parent
- Limit features until verified:
  - ✅ Can create games
  - ❌ Cannot publish games
  - ❌ Cannot share links
  - ❌ Profile not public

**Verification Flow:**
```typescript
async function sendParentVerification(userId: string, parentEmail: string) {
  const token = generateSecureToken();

  await supabase.from('parent_verifications').insert({
    user_id: userId,
    parent_email: parentEmail,
    token,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });

  await sendEmail({
    to: parentEmail,
    subject: 'Verify your child\'s account',
    body: `Click here to verify: ${APP_URL}/verify/${token}`
  });
}
```

## Project Storage

### Save Project

```typescript
async function saveProject(projectId: string, code: string) {
  // 1. Update file content
  await supabase.from('files').upsert({
    project_id: projectId,
    name: 'game.js',
    content: code,
    version: currentVersion + 1
  });

  // 2. Save version history (keep last 10)
  await supabase.from('file_versions').insert({
    file_id: fileId,
    content: code,
    version: currentVersion + 1
  });

  // Cleanup old versions
  await supabase.from('file_versions')
    .delete()
    .eq('file_id', fileId)
    .lt('version', currentVersion - 9);

  // 3. Update project timestamp
  await supabase.from('projects').update({
    updated_at: new Date()
  }).eq('id', projectId);
}
```

### Asset Upload

```typescript
async function uploadAsset(projectId: string, file: File) {
  // 1. Validate
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large (max 5MB)');
  }

  const allowedTypes = ['image/png', 'image/jpeg', 'audio/mpeg', 'audio/wav'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }

  // 2. Upload to Supabase Storage
  const path = `${projectId}/${file.name}`;
  const { data, error } = await supabase.storage
    .from('assets')
    .upload(path, file);

  // 3. Save metadata
  await supabase.from('assets').insert({
    project_id: projectId,
    filename: file.name,
    storage_path: data.path,
    file_type: file.type.startsWith('image') ? 'image' : 'audio',
    size_bytes: file.size
  });

  return data.path;
}
```

## Rate Limiting

```typescript
// 10 projects per user
const PROJECT_LIMIT = 10;

async function checkProjectLimit(userId: string) {
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId);

  if (count >= PROJECT_LIMIT) {
    throw new Error('Project limit reached (max 10)');
  }
}

// 20 AI prompts per hour
const RATE_LIMIT_KEY = `prompts:${userId}:${hour}`;
const count = await redis.incr(RATE_LIMIT_KEY);
await redis.expire(RATE_LIMIT_KEY, 3600);

if (count > 20) {
  throw new Error('Rate limit exceeded');
}
```
