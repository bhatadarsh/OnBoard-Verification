"""
Normalization & Validation Tools — Robust field mapping, smart matching, filtering.

This module handles:
1. CSV field filtering (drops irrelevant onboarding fields)
2. Semantic field name normalization (email_id → email)
3. Cross-field KB lookup (form 'aadhar' → KB 'aadhar_number')
4. Smart value matching (dates, phones, degrees, locations, names, IDs)

IMPORTANT DESIGN PRINCIPLES:
- Only match fields we are CERTAIN about — no fuzzy key guessing
- Every field alias must be explicitly listed
- Date formats must be normalized before comparison
- ID fields (aadhar, pan, gender) must use STRICT equality (no substrings)
- Bank details validation added
"""
import re
from typing import Dict, Any, Tuple, Optional
from datetime import datetime
import difflib


# ============ FIELD CLASSIFICATION ============

# Fields to COMPLETELY IGNORE from CSV — not useful for document validation
IGNORE_FIELDS = {
    # Metadata / timestamps
    'timestamp', 'created_at', 'updated_at', 'submitted_at',
    'date_of_declaration', 'date_of_submission', 'submission_date', 'form_date',
    # Consent / legal / agreements
    'consent', 'i_agree', 'accept', 'terms', 'agree_terms', 'declaration',
    'nda', 'code_of_conduct', 'data_privacy', 'privacy_agreement',
    # Emergency contact (no document can verify this)
    'emergency_contact', 'emergency_contact_name', 'emergency_contact_number',
    'emergency_contact_person_name', 'emergency_contact_relationship',
    'emergency_person', 'emergency_phone', 'emergency_relation',
    # Yes/No questions (not data fields)
    'is_your_permanent_address_the_same_as_your_current_address',
    'is_permanent_address_same_as_current_address',
    'same_as_permanent_address', 'same_address',
    'do_you_have_any_previous_work_experience',
    # Uploads, photos, signatures
    'signature', 'digital_signature', 'photo', 'image', 'picture',
    'profile_pic', 'avatar', 'upload', 'file_upload', 'attachment',
    'document_upload', 'passport_photo', 'candidate_photo',
    # Internal IDs
    'id', 'row_id', 'serial', 'sr_no', 'sno', 'form_id',
    'submission_id', 'response_id',
    # Technical metadata
    'ip_address', 'browser', 'device', 'user_agent',
    'captcha', 'recaptcha', 'verification_code',
    # Non-verifiable from documents
    'nationality', 'marital_status', 'blood_group', 'religion', 'caste',
    'category', 'languages_known', 'hobbies', 'interests',
    # IT / admin fields
    'department', 'department_select_from_the_list',
    'select_the_it_and_system_access_you_require',
    'it_system_access', 'system_access', 'laptop', 'equipment',
    'employment_type', 'offer_letter', 'joining_date',
    'reporting_manager', 'team', 'designation_offered',
    # Note: Bank details ARE verifiable if user uploads passbook/cheque
    # so we do NOT ignore them anymore
}

# Partial ignore patterns — if field name CONTAINS any of these, ignore it
IGNORE_PATTERNS = [
    'emergency', 'nda', 'declaration', 'consent', 'agree', 'accept',
    'signature', 'upload', 'attachment', 'captcha',
    'is_your_permanent', 'same_as_permanent', 'same_as_current',
    'do_you_have', 'select_', 'choose_', 'access', 'system',
    'department', 'previous_work', 'joining_date', 'start_date',
    'relocation', 'notice_period_buyout', 'source_of_hiring',
    'transport', 'canteen', 'pf_account', 'uan', 'esi',
    'reference', 'referrer', 'background_check', 
    'nominee', 'gratuity', 'medical', 'insurance',
]

# ============ FIELD MAPPINGS ============
# Canonical form → list of aliases that should map to it
FIELD_MAPPINGS = {
    'full_name': [
        'name', 'candidate_name', 'full name', 'candidate name',
        'applicant name', 'employee_name', 'first_name', 'student_name',
        'account_holder_name', 'name_as_per_bank',
    ],
    'father_name': [
        'fathers_name', 'father name', 'fathers name', 'father',
        'guardian_name', 'father_s_name',
    ],
    'email': [
        'email_id', 'emailid', 'personal_email', 'email address',
        'e_mail', 'mail_id', 'mail', 'email_address',
    ],
    'phone': [
        'phone_no', 'phone_number', 'mobile', 'mobile_no', 'mobile_number',
        'contact', 'contact_no', 'cell', 'contact_number',
    ],
    'permanent_address': [
        'perm_address', 'permanent address', 'home_address', 'residence',
        'permanent_address_only_if_different_from_current_address',
    ],
    'current_address': [
        'curr_address', 'present_address', 'current_location', 'work_location',
        'current_address_street_house_no_city_state_pin_code_country',
        'address',
    ],
    'dob': [
        'date_of_birth', 'dateofbirth', 'birth_date', 'birthdate',
        'd_o_b', 'date_of_birth_dd_mm_yyyy',
    ],
    'gender': ['sex', 'gender_select'],
    'graduation_degree': [
        'degree', 'highest_qualification', 'qualification', 'education',
        'ug_degree', 'highest_degree', 'graduation_degree_specialization',
        'degree_course_name', 'course_name', 'degree_name',
    ],
    'graduation_college': [
        'college', 'university', 'institute', 'ug_college',
        'graduation_university', 'college_name', 'university_name',
        'graduation_college_university', 'college_university_name',
        'institution_name',
    ],
    'graduation_year': [
        'year_of_passing', 'passing_year', 'grad_year', 'ug_year',
        'graduation_year_of_passing', 'year_of_passing_highest_qualification',
    ],
    'school_10th': [
        '10th_school', 'ssc_school', 'matriculation_school', 'high_school',
        'class_10_school', 'x_school', '10th_school_name',
    ],
    'percentage_10th': [
        '10th_percentage', '10th_marks', 'ssc_percentage', '10th_score',
        'class_10_percentage', 'x_percentage', '10th_percentage_cgpa',
    ],
    'year_10th': [
        '10th_year_of_passing', '10th_year', 'ssc_year', 'x_year',
    ],
    'school_12th': [
        '12th_school', 'hsc_school', 'intermediate_school', 'higher_secondary',
        'class_12_school', 'xii_school', '12th_school_name',
    ],
    'percentage_12th': [
        '12th_percentage', '12th_marks', 'hsc_percentage', '12th_score',
        'class_12_percentage', 'xii_percentage', '12th_percentage_cgpa',
    ],
    'year_12th': [
        '12th_year_of_passing', '12th_year', 'hsc_year', 'xii_year',
    ],
    'skills': [
        'technical_skills', 'key_skills', 'skills_technologies',
    ],
    'current_company': [
        'company', 'employer', 'organization', 'current_employer',
        'present_company', 'company_name',
    ],
    'current_role': [
        'role', 'designation', 'position', 'job_title',
        'current_position', 'current_designation',
    ],
    'current_ctc': [
        'ctc', 'salary', 'current_salary', 'present_ctc',
        'annual_ctc', 'current_annual_ctc',
    ],
    'expected_ctc': [
        'expected_salary', 'exp_ctc', 'desired_ctc', 'expected_package',
    ],
    'notice_period': [
        'notice', 'notice_days', 'np', 'serving_notice', 'notice_period_days',
    ],
    'experience': [
        'total_experience', 'work_experience', 'years_of_experience',
        'exp', 'experience_years',
    ],
    'aadhar_number': [
        'aadhar', 'aadhaar', 'aadhaar_number', 'aadhar_no', 'aadhaar_no',
    ],
    'pan_number': [
        'pan', 'pan_card', 'pan_no',
    ],
    'bank_account_number': [
        'bank_account', 'account_number', 'account_no', 'bank_account_no',
        'savings_account_number',
    ],
    'ifsc_code': [
        'ifsc', 'ifsc_code', 'bank_ifsc', 'branch_ifsc',
    ],
    'bank_name': [
        'bank_name', 'bank', 'bank_branch',
    ],
}

# ============ KB FIELD LOOKUP TABLE ============
# Maps canonical form field → specific KB field names to look for.
KB_FIELD_LOOKUP = {
    'full_name':          ['full_name', 'student_name', 'candidate_name', 'name', 'account_holder_name'],
    'father_name':        ['father_name', 'fathers_name', 'guardian_name'],
    'email':              ['email', 'email_id', 'personal_email', 'mail'],
    'phone':              ['phone', 'phone_no', 'mobile', 'contact', 'mobile_number'],
    'dob':                ['dob', 'date_of_birth', 'birth_date'],
    'gender':             ['gender', 'sex'],
    'permanent_address':  ['permanent_address', 'address', 'home_address'],
    'current_address':    ['current_address', 'current_location', 'present_address',
                           'confirmed_current_location'],
    'graduation_degree':  ['graduation_degree', 'degree', 'highest_qualification',
                           'qualification', 'course_name'],
    'graduation_college': ['graduation_college', 'college', 'university',
                           'institute', 'institution', 'college_name'],
    'graduation_year':    ['graduation_year', 'year_of_passing', 'passing_year'],
    'school_10th':        ['10th_school', 'school_10th'],
    'percentage_10th':    ['10th_percentage', 'percentage_10th', 'total_marks'],
    'year_10th':          ['10th_year', 'year_10th', 'year_of_passing'],
    'school_12th':        ['12th_school', 'school_12th'],
    'percentage_12th':    ['12th_percentage', 'percentage_12th'],
    'year_12th':          ['12th_year', 'year_12th', 'year_of_passing'],
    'skills':             ['skills', 'technical_skills', 'key_skills'],
    'current_company':    ['current_company', 'company', 'employer', 'organization'],
    'current_role':       ['current_role', 'role', 'designation', 'position'],
    'current_ctc':        ['current_ctc', 'ctc', 'salary', 'last_drawn_ctc'],
    'expected_ctc':       ['expected_ctc', 'expected_salary'],
    'notice_period':      ['notice_period', 'notice', 'notice_days'],
    'experience':         ['experience', 'total_experience', 'work_experience'],
    'aadhar_number':      ['aadhar_number', 'aadhaar_number'],
    'pan_number':         ['pan_number', 'pan', 'pan_no'],
    'bank_account_number':['bank_account_number', 'account_number', 'account_no'],
    'ifsc_code':          ['ifsc_code', 'ifsc'],
    'bank_name':          ['bank_name', 'bank'],
}

# Degree abbreviation mappings
DEGREE_MAPPINGS = {
    'btech': 'bachelor of technology', 'b.tech': 'bachelor of technology',
    'b tech': 'bachelor of technology', 'be': 'bachelor of engineering',
    'b.e': 'bachelor of engineering', 'b.e.': 'bachelor of engineering',
    'bsc': 'bachelor of science', 'b.sc': 'bachelor of science',
    'bca': 'bachelor of computer applications',
    'mtech': 'master of technology', 'm.tech': 'master of technology',
    'mba': 'master of business administration',
    'mca': 'master of computer applications',
    'msc': 'master of science', 'm.sc': 'master of science',
    'phd': 'doctor of philosophy',
    'cse': 'computer science engineering',
    'ece': 'electronics and communication engineering',
    'eee': 'electrical and electronics engineering',
    'it': 'information technology',
    'cs': 'computer science',
    'bachelors': 'bachelor', 'masters': 'master',
}

# Location normalization
LOCATION_MAPPINGS = {
    'bangalore': ['bengaluru', 'blr', 'banglore', 'bangaluru'],
    'mumbai': ['bombay'],
    'chennai': ['madras'],
    'kolkata': ['calcutta'],
    'delhi': ['new delhi', 'ncr', 'delhi ncr'],
    'hyderabad': ['hyd', 'secundrabad'],
    'pune': ['puna'],
    'noida': ['greater noida'],
    'gurgaon': ['gurugram', 'ggn'],
    'dombivli': ['dombivali', 'dombivilli', 'dombivli east', 'dombivli west'],
    'vasind': ['vasai'],
    'thane': ['thana'],
}


# ============ FIELD DETECTION & NORMALIZATION ============

def is_important_field(field: str) -> bool:
    """Check if a field is important for onboarding validation."""
    field_clean = field.lower().strip().replace(' ', '_').replace('-', '_')
    field_clean = re.sub(r'[^a-z0-9_]', '', field_clean)

    # 1. Whitelist: explicitly mapped fields are ALWAYS important
    for canonical, aliases in FIELD_MAPPINGS.items():
        if field_clean == canonical:
            return True
        for alias in aliases:
            if field_clean == alias.lower().replace(' ', '_'):
                return True

    # 2. Exact blacklist match
    if field_clean in IGNORE_FIELDS:
        return False

    # 3. Partial pattern match
    for pattern in IGNORE_PATTERNS:
        if pattern in field_clean:
            return False

    # 4. Suffix/prefix blacklist check
    for ignore in IGNORE_FIELDS:
        if field_clean.startswith(ignore + '_') or field_clean.endswith('_' + ignore):
            return False

    return len(field_clean) > 2


def normalize_field_name(field: str) -> str:
    """Map a field name to its canonical form."""
    field_lower = field.lower().strip().replace(' ', '_').replace('-', '_')
    field_lower = re.sub(r'[^a-z0-9_]', '', field_lower)

    for canonical, aliases in FIELD_MAPPINGS.items():
        if field_lower == canonical:
            return canonical
        for alias in aliases:
            if field_lower == alias.lower().replace(' ', '_'):
                return canonical

    return field_lower


def normalize_form_data(form_data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize and filter form data: canonical field names + drop unimportant fields."""
    normalized = {}
    for key, value in form_data.items():
        if not is_important_field(key):
            continue
        canonical = normalize_field_name(key)
        if canonical not in normalized:
            normalized[canonical] = value
    return normalized


# ============ TEXT NORMALIZATION ============

def normalize_text(text: str) -> str:
    """Normalize text for comparison."""
    if not text:
        return ""
    text = str(text).lower().strip()
    text = re.sub(r'[,.\-_\'\"()\[\]{}:;!?]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def normalize_phone(phone: str) -> str:
    """Normalize phone number: remove country codes, spaces, dashes."""
    if not phone:
        return ""
    digits = re.sub(r'\D', '', str(phone))
    if len(digits) > 10 and digits.startswith('91'):
        digits = digits[2:]
    if len(digits) > 10 and digits.startswith('0'):
        digits = digits[1:]
    return digits[-10:] if len(digits) >= 10 else digits


def normalize_date(date_str: str) -> Optional[str]:
    """Normalize date to YYYY-MM-DD format, handling multiple input formats."""
    if not date_str:
        return None
    date_str = str(date_str).strip()

    formats = [
        '%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y',
        '%Y/%m/%d', '%m/%d/%Y', '%d %b %Y', '%d %B %Y',
        '%b %d, %Y', '%B %d, %Y',
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue
            
    # Try digits only
    digits = re.sub(r'\D', '', date_str)
    if len(digits) == 8:
        for fmt in ['%d%m%Y', '%Y%m%d']:
            try:
                dt = datetime.strptime(digits, fmt)
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                pass
    return None


def expand_abbreviations(text: str) -> str:
    """Expand common abbreviations in text."""
    if not text:
        return ""
    text_lower = text.lower()
    for abbr, full in DEGREE_MAPPINGS.items():
        if re.search(rf'\b{re.escape(abbr)}\b', text_lower):
            text_lower = re.sub(rf'\b{re.escape(abbr)}\b', full, text_lower)
    return text_lower


def normalize_location(location: str) -> str:
    """Normalize location names to canonical city."""
    if not location:
        return ""
    location_lower = normalize_text(location)
    for canonical, aliases in LOCATION_MAPPINGS.items():
        if canonical in location_lower or any(a in location_lower for a in aliases):
            return canonical
    return location_lower


# ============ SMART VALUE MATCHING ============

def values_match(form_value: str, doc_value: str, field_type: str = "text") -> Tuple[bool, str]:
    """Check if two values match semantically.

    Returns (match: bool, reason: str).
    Strategies applied in order:
    1. Exact normalized match
    2. Date format normalization
    3. Phone number normalization
    4. ID number / Gender comparison (STRICT)
    5. Location city-level matching
    6. Degree/education matching
    7. Salary/Marks numeric comparison
    8. General substring match (DISABLED for IDs/Gender)
    """
    if not form_value or not doc_value:
        return False, "One or both values are empty"

    fv = str(form_value).strip()
    dv = str(doc_value).strip()
    fv_norm = normalize_text(fv)
    dv_norm = normalize_text(dv)

    # 1. Exact match after normalization
    if fv_norm == dv_norm:
        return True, "Exact match (normalized)"

    # 2. Gender STRICT comparison (no substrings allowed)
    if any(x in field_type.lower() for x in ['gender', 'sex']):
        if fv_norm == dv_norm:
             return True, "Gender matches"
        else:
             return False, f"Gender mismatch: '{fv}' ≠ '{dv}'"

    # 3. Date comparison
    if any(x in field_type.lower() for x in ['dob', 'date', 'birth']):
        fv_date = normalize_date(fv)
        dv_date = normalize_date(dv)
        if fv_date and dv_date and fv_date == dv_date:
            return True, "Dates match (format-normalized)"
        if fv_date and dv_date:
            return False, f"Date mismatch: '{fv_date}' ≠ '{dv_date}'"

    # 4. Phone comparison
    if any(x in field_type.lower() for x in ['phone', 'mobile', 'contact']):
        fv_phone = normalize_phone(fv)
        dv_phone = normalize_phone(dv)
        if fv_phone and dv_phone and fv_phone == dv_phone:
            return True, "Phone numbers match (ignoring country code)"

    # 5. ID comparison (Aadhar/PAN/Bank) - STRICT
    if any(x in field_type.lower() for x in ['aadhar', 'aadhaar', 'pan', 'bank', 'account', 'ifsc']):
        # Remove all special chars, keep alphanumeric
        fv_id = re.sub(r'[^a-zA-Z0-9]', '', fv.upper())
        dv_id = re.sub(r'[^a-zA-Z0-9]', '', dv.upper())
        
        if not fv_id or not dv_id:
            return False, "Empty ID value"

        # Check for masked match
        if 'X' in dv_id or 'X' in fv_id:
            if len(fv_id) >= 4 and len(dv_id) >= 4 and fv_id[-4:] == dv_id[-4:]:
                return True, "ID matches (masked verification)"
        
        if fv_id == dv_id:
            return True, "ID exact match"
            
        return False, f"ID mismatch: '{fv}' ≠ '{dv}'"

    # 6. Location matching
    if any(x in field_type.lower() for x in ['address', 'location']):
        fv_loc = normalize_location(fv)
        dv_loc = normalize_location(dv)
        if fv_loc and dv_loc:
             if fv_loc == dv_loc: return True, "Locations match (city-level)"
             if fv_loc in dv_loc or dv_loc in fv_loc: return True, "Location partial match"

    # 7. Degree matching
    if any(x in field_type.lower() for x in ['degree', 'qualification', 'education', 'school', 'college']):
        fv_exp = expand_abbreviations(fv_norm)
        dv_exp = expand_abbreviations(dv_norm)
        if fv_exp == dv_exp: return True, "Matches (expanded abbreviations)"
        if fv_exp in dv_exp or dv_exp in fv_exp: return True, "Partial match (education)"
        
        # Word overlap
        fv_words = set(fv_exp.split())
        dv_words = set(dv_exp.split())
        common = fv_words & dv_words
        if len(common) >= 2 and len(common) / min(len(fv_words), len(dv_words)) >= 0.5:
            return True, "Education match (word overlap)"

    # 8. Numeric comparison (Salary/Marks)
    if any(x in field_type.lower() for x in ['ctc', 'salary', 'percentage', 'marks', 'score']):
         fv_num = re.sub(r'[^\d.]', '', fv)
         dv_num = re.sub(r'[^\d.]', '', dv)
         if fv_num and dv_num:
             try:
                 f, d = float(fv_num), float(dv_num)
                 # Handle scaling (Lakhs vs absolute)
                 if f < 100 and d > 10000: f *= 100000
                 if d < 100 and f > 10000: d *= 100000
                 
                 diff = abs(f - d)
                 if diff < 0.5 or (max(f,d) > 0 and diff/max(f,d) < 0.1):
                     return True, "Numeric values match"
             except:
                 pass

    # 9. Semantic Fuzzy Confidence Matching (FALLBACK)
    # Uses native difflib.SequenceMatcher for string similarity
    if len(fv_norm) > 3 and len(dv_norm) > 3:
        confidence = difflib.SequenceMatcher(None, fv_norm, dv_norm).ratio() * 100
        
        if confidence >= 80:
            return True, f"Semantic Match (Confidence: {round(confidence, 1)}%)"
        elif confidence >= 60:
            return False, f"Suspicious mismatch (Confidence: {round(confidence, 1)}% < 80% threshold)"

    return False, f"Mismatch: Form '{fv}' ≠ Doc '{dv}'"
