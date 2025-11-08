# COPPA Compliance Documentation

## Overview

The Children's Online Privacy Protection Act (COPPA) requires parental consent before collecting personal information from children under 13.

---

## Data Collection

### Information We Collect

**From all users:**
- Username (public)
- Password (hashed)
- Birthdate (to determine age)
- Game projects (code, assets)
- Usage analytics (anonymous)

**From users under 13 (with parental consent only):**
- Parent email address
- Share links / public profile

**We DO NOT collect:**
- Full names
- Physical addresses
- Phone numbers
- Photos of users
- Geolocation (beyond country-level)
- Social Security numbers

---

## Age Verification

### Signup Flow

1. User enters username, password, birthdate
2. System calculates age
3. If under 13:
   - Account created with restricted permissions
   - Prompt for parent email
   - Send verification email to parent
   - Block sharing features until verified

### Parent Verification

**Email sent to parent includes:**
- Child's username
- Platform description
- Link to privacy policy
- Verification link (expires in 7 days)
- Instructions to revoke consent

**Verification link:**
```
https://yourdomain.com/verify-parent/{token}
```

**Parent landing page:**
- Explains what child can do
- Shows privacy policy
- "I consent" button
- "Revoke access" button

---

## Feature Restrictions

### Before Parent Verification

| Feature | Allowed |
|---------|---------|
| Create games | ✅ Yes |
| Edit code | ✅ Yes |
| Test locally | ✅ Yes |
| Share games | ❌ No |
| Publish games | ❌ No |
| Public profile | ❌ No |
| View other games | ✅ Yes (curated only) |
| Remix games | ✅ Yes (save private) |

### After Parent Verification

All features enabled.

---

## Parental Controls

### Parent Dashboard

**Access:** `/parent/dashboard/{token}`

**Features:**
- View child's projects
- See play history
- Disable sharing
- Delete account
- Export data
- Revoke consent

### Revocation

If parent revokes consent:
1. Immediately disable sharing
2. Make all projects private
3. Send confirmation email
4. Optionally: delete account after 30 days

---

## Data Retention

- User data: retained until account deletion
- Deleted accounts: 30-day grace period
- After deletion: data permanently removed
- Backups: removed within 90 days

---

## Privacy Policy

### Key Points

1. **No ads** to users under 13
2. **No third-party tracking** (no Google Analytics for under-13 users)
3. **Parental access** to all child data
4. **Right to deletion** at any time
5. **No data sale** to third parties

### Required Disclosures

- What data we collect
- How we use it
- Third parties with access (Supabase, OpenAI)
- How parents can review/delete data
- Our contact information

---

## Technical Implementation

### Database Flags

```sql
-- Check if user can share
CREATE FUNCTION can_user_share(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT
    CASE
      WHEN age >= 13 THEN TRUE
      WHEN parent_verified = TRUE THEN TRUE
      ELSE FALSE
    END
  FROM users WHERE id = user_id;
$$ LANGUAGE SQL;

-- Enforce on project publish
CREATE POLICY "users can only publish if allowed"
  ON projects FOR UPDATE
  USING (can_user_share(owner_id));
```

### UI Enforcement

```typescript
async function checkCanShare(userId: string): Promise<boolean> {
  const { data } = await supabase
    .rpc('can_user_share', { user_id: userId });

  return data;
}

// Before showing share button
if (await checkCanShare(userId)) {
  showShareButton();
} else {
  showParentVerificationPrompt();
}
```

---

## Compliance Checklist

- [ ] Privacy policy published
- [ ] Parental consent flow implemented
- [ ] Feature restrictions for under-13
- [ ] Parent dashboard functional
- [ ] Data deletion process tested
- [ ] No ads to children
- [ ] No third-party tracking for children
- [ ] Contact email for privacy questions
- [ ] Annual review of practices
- [ ] Staff training on COPPA

---

## COPPA Safe Harbor Certification

### Recommended Certification Path

**MVP Phase (Year 1):**
- **kidSAFE+ COPPA Seal** - $2,000-$3,000/year
  - FTC-approved Safe Harbor
  - Annual compliance audit
  - Display trust seal on site
  - Affordable for startups
  - Website: kidsafeseal.com

**Growth Phase (Year 2+):**
- **PRIVO Certification** - $10,000-$15,000/year
  - Industry gold standard
  - Comprehensive audits
  - Parental consent API integration
  - Ongoing compliance consulting
  - Trusted by Roblox, Disney, Mattel
  - Website: privo.com

### Other FTC-Approved Options

1. **iKeepSafe COPPA Safe Harbor** - $3,000-$10,000/year
   - Strong in educational technology
   - Website: ikeepsafe.org

2. **CARU (BBB National Programs)** - $10,000-$25,000/year
   - Best for platforms with advertising
   - BBB brand recognition
   - Website: bbbprograms.org

### Benefits of Safe Harbor Certification

- ✅ FTC-approved compliance
- ✅ Parent trust and recognition
- ✅ Safe harbor from direct FTC enforcement
- ✅ Annual audits keep you up-to-date
- ✅ Professional review of practices
- ✅ Marketing advantage over non-certified competitors

### Additional Trust Signals

- **ESRB Privacy Certified** - Gaming-focused privacy seal
- **Common Sense Media** - Free game reviews/ratings
- **TRUSTe Kids Privacy** - General privacy certification

---

## Implementation Timeline

### Pre-Launch
- [ ] Self-compliance with COPPA
- [ ] Privacy policy published
- [ ] Parent consent flow working

### Month 1-3 (Soft Launch)
- [ ] Apply for kidSAFE+ certification
- [ ] Initial audit and remediation
- [ ] Display seal on website

### Month 6-12
- [ ] Annual kidSAFE renewal
- [ ] Consider upgrading to PRIVO

### Year 2+
- [ ] PRIVO certification if scaling
- [ ] Integrate PRIVO consent APIs

---

## Resources

- FTC COPPA guidance: https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business
- COPPA FAQ: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- FTC Safe Harbor Program: https://www.ftc.gov/enforcement/coppa-safe-harbor-program

---

## Contact

For privacy questions:
- Email: privacy@yourdomain.com
- Mail: [Physical address required by COPPA]

For certification questions:
- kidSAFE: contact@kidsafeseal.com
- PRIVO: info@privo.com
