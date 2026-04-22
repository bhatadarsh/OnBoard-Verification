from sqlalchemy.orm import Session
from fastapi import HTTPException,Depends,status
from candidate.models.candidate_account import CandidateAccount
from candidate.models.candidate_education import CandidateEducation
from candidate.models.certificates import Certificate
from candidate.models.candidate_profile import CandidateProfile
from candidate.models.applications  import Application
from candidate.jwt.security import create_access_token
from candidate.models.candidate_experience  import CandidateExperience
from job_description.models.job_description import JobDescription
from sqlalchemy.orm import joinedload, selectinload
from app.db.database import get_db

class CandidateService:
    @staticmethod
    def verify_password(self, plain_password: str) -> bool:
        """Check plain password against stored hash."""
        try:
            import bcrypt
            return bcrypt.checkpw(plain_password.encode(), self.password_hash.encode())
        except ImportError:
            import hashlib
            return self.password_hash == hashlib.sha256(plain_password.encode()).hexdigest()

    @staticmethod
    def create_candidate(db: Session, payload, cand_id: str):

        existing_user = db.query(CandidateAccount).filter(
            CandidateAccount.email == payload.email
        ).first()

        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        new_candidate = CandidateAccount(
            id         = cand_id,
            first_name = payload.first_name,
            last_name  = payload.last_name,
            email      = payload.email,
            mobile     = payload.mobile,
            password_hash = "",   # temporary — set properly below
        )

        # Call set_password on the instance — this is how it works
        new_candidate.set_password(payload.password)

        try:
            db.add(new_candidate)
            db.commit()
            db.refresh(new_candidate)
            return new_candidate
        except Exception as e:
            db.rollback()
            raise e
    
    @staticmethod
    def login_candidate(email:str,password:str,db: Session):

        try :
            candidate = db.query(CandidateAccount).filter(CandidateAccount.email == email).first()
            if not candidate:
                raise HTTPException(status_code=401, detail="Email not registered")
            
            if not CandidateService.verify_password(candidate,password):
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            token_data = {"sub": candidate.email, "id": candidate.id, "role": candidate.role}
            access_token = create_access_token(data=token_data)
            return {
                "access_token": access_token,
                "candidate_id": candidate.id,
                "email":candidate.email
            }
        except Exception as e:
            db.rollback()
            raise e
            
    # @staticmethod  
    # def apply(jd_id:str,payload,candidate_id: str,db:Session):
        
    #     account = db.query(CandidateAccount).filter(
    #         CandidateAccount.id == candidate_id
    #     ).first()

    #     if not account:
    #         raise HTTPException(status_code=404, detail="Candidate not found")

    #     changes_detected = {}

    #     # ── account changes 
    #     account_changes = {}
    #     if payload.first_name != account.first_name:
    #         account_changes["first_name"] = {"old": account.first_name, "new": payload.first_name}
    #         account.first_name = payload.first_name
    #     if payload.last_name != account.last_name:
    #         account_changes["last_name"] = {"old": account.last_name, "new": payload.last_name}
    #         account.last_name = payload.last_name
    #     if payload.mobile != account.mobile:
    #         account_changes["mobile"] = {"old": account.mobile, "new": payload.mobile}
    #         account.mobile = payload.mobile

    #     if account_changes:
    #         changes_detected["account"] = account_changes

    #     profile = db.query(CandidateProfile).filter(CandidateProfile.candidate_id == candidate_id).first()
    #     pd = payload.profile_details
    #     profile_changes = {}

    #     if profile:
    #         # Compare each field
    #         fields_to_check = [
    #             ("gender",            pd.gender),
    #             ("city",              pd.city),
    #             ("state",             pd.state),
    #             ("permanent_address", pd.permanent_address),
    #             ("pincode",           pd.pincode),
    #             ("nationality",       pd.nationality),
    #             ("linkedin_url",      pd.linkedin_url),
    #         ]
    #         for field_name, new_value in fields_to_check:
    #             old_value = getattr(profile, field_name)
    #             if old_value != new_value:
    #                 profile_changes[field_name] = {"old": old_value, "new": new_value}
    #                 setattr(profile, field_name, new_value)
    #     else:
    #         # No profile exists yet — create it
    #         profile = CandidateProfile(
                
    #             candidate_id= candidate_id,
    #             **pd.dict()
    #         )
    #         print("************* profile updated")
    #         db.add(profile)
    #         profile_changes["created"] = True

    #     if profile_changes:
    #         changes_detected["profile"] = profile_changes

            
    #    # ── 3. Detect + save education changes ────────────────────────────────
    #     existing_education = db.query(CandidateEducation).filter(
    #         CandidateEducation.candidate_id == candidate_id
    #     ).all()

    #     if existing_education:

        
    #         existing_edu_data = [
    #             {
    #                 "degree_name": e.degree_name,
    #                 "university":  e.university,
    #                 "start_year":  e.start_year,
    #                 "end_year":    e.end_year,
    #                 "score":       e.score,
    #             }
    #             for e in existing_education
    #         ]
    #         new_edu_data = [
    #             {
    #                 "degree_name": e.degree_name,
    #                 "university":  e.university,
    #                 "start_year":  e.start_year,
    #                 "end_year":    e.end_year,
    #                 "score":       e.score,
    #             }
    #             for e in payload.education
    #         ]

    #         if existing_edu_data != new_edu_data:
    #             print("current != existing")
    #             # Education changed — delete and re-insert
    #             db.query(CandidateEducation).filter(
    #                 CandidateEducation.candidate_id == candidate_id
    #             ).delete()
    #             for edu in payload.education:
    #                 db.add(CandidateEducation(
                        
    #                     candidate_id          = candidate_id,
    #                     highest_qualification = edu.highest_qualification,
    #                     degree_name           = edu.degree_name,
    #                     university            = edu.university,
    #                     start_month           = edu.start_month,
    #                     end_month             = edu.end_month,
    #                     start_year            = edu.start_year,
    #                     end_year              = edu.end_year,
    #                     score                 = edu.score,
    #                 ))
    #             changes_detected["education"] = {
    #                 "old_count": len(existing_edu_data),
    #                 "new_count": len(new_edu_data),
    #             }
    #     else:
    #         for edu in payload.education:
    #                 print("---------- inside the education current == existing")
    #                 db.add(CandidateEducation(
                        
    #                     candidate_id          = candidate_id,
    #                     highest_qualification = edu.highest_qualification,
    #                     degree_name           = edu.degree_name,
    #                     university            = edu.university,
    #                     start_month           = edu.start_month,
    #                     end_month             = edu.end_month,
    #                     start_year            = edu.start_year,
    #                     end_year              = edu.end_year,
    #                     score                 = edu.score,
    #                 ))
       
    #     # ── 4. Detect + save certificate changes ──────────────────────────────
        
    #     # cert_paths = payload.certificate_paths or []
    #     # existing_cert_data = [{"name": c.name, "provider": c.provider, "year": c.year} for c in existing_certs]
    #     # new_cert_data      = [{"name": c.name, "provider": c.provider, "year": c.year} for c in (payload.certificates or [])]
        
    #     # if existing_certs:
    #     #     if existing_cert_data != new_cert_data:
    #     #         print("current != existing")
    #     #         db.query(Certificate).filter(
    #     #             Certificate.candidate_id == candidate_id
    #     #         ).delete()
                
    #     #         for cert, path in zip(payload.certificates or [], cert_paths):
    #     #             db.add(Certificate(
    #     #                 candidate_id = candidate_id,
    #     #                 name         = cert.name,
    #     #                 provider     = cert.provider,
    #     #                 year         = cert.year,
    #     #                 certificate_path = path  # Save the path here!
    #     #             ))
    #     #         changes_detected["certificates"] = {
    #     #             "old_count": len(existing_cert_data),
    #     #             "new_count": len(new_cert_data),
    #     #         }
    #     # else:
    #     #     for cert, path in zip(payload.certificates or [], cert_paths):
    #     #             db.add(Certificate(
    #     #                 candidate_id = candidate_id,
    #     #                 name         = cert.name,
    #     #                 provider     = cert.provider,
    #     #                 year         = cert.year,
    #     #                 certificate_path = path  # Save the path here!
    #     #             ))
    #     #     print("Certificates added first time")
    #     new_certs = payload.certificates or []
    #     new_paths = payload.certificate_paths or []

    #     # Ensure we have a path for every certificate
    #     if len(new_certs) != len(new_paths):
    #         raise ValueError("Mismatch between certificate objects and provided paths")
        
    #     existing_certs = db.query(Certificate).filter(
    #         Certificate.candidate_id == candidate_id
    #     ).all()

    #     # 2. Compare data
    #     new_cert_data = [{"name": c.name, "provider": c.provider, "year": c.year} for c in new_certs]
    #     existing_cert_data = [{"name": c.name, "provider": c.provider, "year": c.year} for c in existing_certs]

    #     if existing_certs:
    #         if existing_cert_data != new_cert_data:
    #             # 3. Perform the update in a clean, unified block
    #             # Delete old records
    #             db.query(Certificate).filter(Certificate.candidate_id == candidate_id).delete()
                
    #             # Add new records
    #             for cert, path in zip(new_certs, new_paths):
    #                 db.add(Certificate(
    #                     candidate_id=candidate_id,
    #                     name=cert.name,
    #                     provider=cert.provider,
    #                     year=cert.year,
    #                     certificate_path=path
    #                 ))
                
    #             changes_detected["certificates"] = {
    #                 "old_count": len(existing_cert_data),
    #                 "new_count": len(new_certs),
    #             }
    #     else:
    #         for cert, path in zip(new_certs, new_paths):
    #                 db.add(Certificate(
    #                     candidate_id=candidate_id,
    #                     name=cert.name,
    #                     provider=cert.provider,
    #                     year=cert.year,
    #                     certificate_path=path
    #                 ))
    #         print("Certificates added first time")
       
    #     if payload.experiences:

    #         existing_exp = db.query(CandidateExperience).filter(CandidateExperience.candidate_id == candidate_id,CandidateExperience.job_id == jd_id).all()
    #         if existing_exp:
    #             for exp in existing_exp:
    #                 db.delete(exp)
    #             db.commit()
    #         else:
    #             for exp in payload.experiences:

    #                 experience = CandidateExperience(
    #                         candidate_id = candidate_id,
    #                         job_id              = jd_id,
    #                         total_experience    = exp.total_experience,
    #                         relevent_experience = exp.relevent_experience,
    #                         current_company     = exp.current_company,
    #                         current_job_title   = exp.current_job_title,
    #                         notice_period       = exp.notice_period,
    #                         current_ctc         = exp.current_ctc,
    #                         expected_ctc        = exp.expected_ctc,
    #                         location_preference = exp.location_preference,
    #                         open_to_relocate    = exp.open_to_relocate,
    #                         resume_path = payload.resume_path
    #                 )
    #                 db.add(experience)

    #     # Create new application
    #     candidate_application=db.query(Application).filter(Application.candidate_id == candidate_id,Application.job_id == jd_id).first()
        
    #     if not candidate_application:
    #         application = Application(
                
    #             candidate_id= candidate_id,
    #             job_id = jd_id
                    
    #         )
    #         db.add(application)
    #     else:
    #         application = candidate_application
    #     try:
    #         db.commit()
    #         return {
    #             "status":           "success",
    #             "candidate_id":     candidate_id,
    #             "job_id":           jd_id,
    #             "application_id":   application.id,
    #             "profile_updated":  len(changes_detected) > 0,
    #             "changes_detected": changes_detected,
    #         }
    #     except Exception as e:
    #         db.rollback()
    #         raise e

    @staticmethod
    def apply(jd_id: str, payload, candidate_id: str, db: Session):

        account = db.query(CandidateAccount).filter(
            CandidateAccount.id == candidate_id
        ).first()

        if not account:
            raise HTTPException(status_code=404, detail="Candidate not found")

        changes_detected = {}

        # ── 1. Account changes ────────────────────────────────────────────────────
        account_changes = {}
        if payload.first_name != account.first_name:
            account_changes["first_name"] = {"old": account.first_name, "new": payload.first_name}
            account.first_name = payload.first_name
        if payload.last_name != account.last_name:
            account_changes["last_name"] = {"old": account.last_name, "new": payload.last_name}
            account.last_name = payload.last_name
        if payload.mobile != account.mobile:
            account_changes["mobile"] = {"old": account.mobile, "new": payload.mobile}
            account.mobile = payload.mobile
        if account_changes:
            changes_detected["account"] = account_changes

        # ── 2. Profile upsert ─────────────────────────────────────────────────────
        profile = db.query(CandidateProfile).filter(
            CandidateProfile.candidate_id == candidate_id
        ).first()
        pd = payload.profile_details
        profile_changes = {}

        if profile:
            fields_to_check = [
                ("gender",            pd.gender),
                ("city",              pd.city),
                ("state",             pd.state),
                ("permanent_address", pd.permanent_address),
                ("pincode",           pd.pincode),
                ("nationality",       pd.nationality),
                ("linkedin_url",      pd.linkedin_url),
            ]
            for field_name, new_value in fields_to_check:
                old_value = getattr(profile, field_name)
                if old_value != new_value:
                    profile_changes[field_name] = {"old": old_value, "new": new_value}
                    setattr(profile, field_name, new_value)
        else:
            profile = CandidateProfile(
                candidate_id=candidate_id,
                **pd.dict()
            )
            db.add(profile)
            profile_changes["created"] = True

        if profile_changes:
            changes_detected["profile"] = profile_changes

        # ── 3. Education upsert 
        existing_education = db.query(CandidateEducation).filter(
            CandidateEducation.candidate_id == candidate_id
        ).all()

        new_edu_data = [
            {
                "degree_name": e.degree_name,
                "university":  e.university,
                "start_year":  e.start_year,
                "end_year":    e.end_year,
                "score":       e.score,
            }
            for e in payload.education
        ]

        if existing_education:
            existing_edu_data = [
                {
                    "degree_name": e.degree_name,
                    "university":  e.university,
                    "start_year":  e.start_year,
                    "end_year":    e.end_year,
                    "score":       e.score,
                }
                for e in existing_education
            ]

            if existing_edu_data != new_edu_data:
                # Changed — delete old rows and re-insert
                db.query(CandidateEducation).filter(
                    CandidateEducation.candidate_id == candidate_id
                ).delete()
                for edu in payload.education:
                    db.add(CandidateEducation(
                        candidate_id          = candidate_id,
                        highest_qualification = edu.highest_qualification,
                        degree_name           = edu.degree_name,
                        university            = edu.university,
                        start_month           = edu.start_month,
                        end_month             = edu.end_month,
                        start_year            = edu.start_year,
                        end_year              = edu.end_year,
                        score                 = edu.score,
                    ))
                changes_detected["education"] = {
                    "old_count": len(existing_edu_data),
                    "new_count": len(new_edu_data),
                }
        else:
            # No education yet — insert fresh
            for edu in payload.education:
                db.add(CandidateEducation(
                    candidate_id          = candidate_id,
                    highest_qualification = edu.highest_qualification,
                    degree_name           = edu.degree_name,
                    university            = edu.university,
                    start_month           = edu.start_month,
                    end_month             = edu.end_month,
                    start_year            = edu.start_year,
                    end_year              = edu.end_year,
                    score                 = edu.score,
                ))
            changes_detected["education"] = {"created": len(payload.education)}

        # ── 4. Certificates upsert 
        new_certs = payload.certificates or []
        new_paths = payload.certificate_paths or []
        print("***************",new_paths)
        print("###############",new_certs)

        print("$$$$$$$$$$",payload.certificates)

        print(len(new_certs))
        print(len(new_paths))
        if len(new_certs) != len(new_paths):
            raise ValueError("Mismatch between certificate objects and provided paths")

        existing_certs = db.query(Certificate).filter(
            Certificate.candidate_id == candidate_id
        ).all()

        new_cert_data = [
            {"name": c.name, "provider": c.provider, "year": c.year}
            for c in new_certs
        ]
        existing_cert_data = [
            {"name": c.name, "provider": c.provider, "year": c.year}
            for c in existing_certs
        ]

        if existing_certs:
            if existing_cert_data != new_cert_data:
                # Delete old DB records
                db.query(Certificate).filter(
                    Certificate.candidate_id == candidate_id
                ).delete()
                # Insert new records with new paths
                for cert, path in zip(new_certs, new_paths):
                    db.add(Certificate(
                        candidate_id     = candidate_id,
                        name             = cert.name,
                        provider         = cert.provider,
                        year             = cert.year,
                        certificate_path = path,
                    ))
                changes_detected["certificates"] = {
                    "old_count": len(existing_cert_data),
                    "new_count": len(new_certs),
                }
            # else: same data, nothing to update
        else:
            # No certificates yet — insert fresh
            for cert, path in zip(new_certs, new_paths):
                db.add(Certificate(
                    candidate_id     = candidate_id,
                    name             = cert.name,
                    provider         = cert.provider,
                    year             = cert.year,
                    certificate_path = path,
                ))
            if new_certs:
                changes_detected["certificates"] = {"created": len(new_certs)}

        # ── 5. Experience upsert 
       
        if payload.experiences:
            existing_exp = db.query(CandidateExperience).filter(
                CandidateExperience.candidate_id == candidate_id,
                CandidateExperience.job_id       == jd_id,
            ).all()

            if existing_exp:
                # UPDATE — delete old records and re-insert with new data
                for exp in existing_exp:
                    db.delete(exp)
                db.flush()  # flush deletes before inserting new rows

                for exp in payload.experiences:
                    db.add(CandidateExperience(
                        candidate_id        = candidate_id,
                        job_id              = jd_id,
                        total_experience    = exp.total_experience,
                        relevent_experience = exp.relevent_experience,
                        company             = exp.current_company,
                        job_title           = exp.current_job_title,
                        notice_period       = exp.notice_period,
                        current_ctc         = exp.current_ctc,
                        expected_ctc        = exp.expected_ctc,
                        location_preference = exp.location_preference,
                        open_to_relocate    = exp.open_to_relocate,
                        resume_path         = payload.resume_path,
                    ))
                changes_detected["experience"] = {"updated": True}
            else:
                # INSERT — first time applying for this JD
                for exp in payload.experiences:
                    db.add(CandidateExperience(
                        candidate_id        = candidate_id,
                        job_id              = jd_id,
                        total_experience    = exp.total_experience,
                        relevent_experience = exp.relevent_experience,
                        company             = exp.current_company,
                        job_title           = exp.current_job_title,
                        notice_period       = exp.notice_period,
                        current_ctc         = exp.current_ctc,
                        expected_ctc        = exp.expected_ctc,
                        location_preference = exp.location_preference,
                        open_to_relocate    = exp.open_to_relocate,
                        resume_path         = payload.resume_path,
                    ))
                changes_detected["experience"] = {"created": len(payload.experiences)}

        # ── 6. Application upsert 
        candidate_application = db.query(Application).filter(
            Application.candidate_id == candidate_id,
            Application.job_id       == jd_id,
        ).first()

        if not candidate_application:
            application = Application(
                candidate_id = candidate_id,
                job_id       = jd_id,
            )
            db.add(application)
        else:
            application = candidate_application

        # ── 7. Commit everything ──────────────────────────────────────────────────
        try:
            db.commit()
            return {
                "status":           "success",
                "candidate_id":     candidate_id,
                "job_id":           jd_id,
                "application_id":   application.id,
                "profile_updated":  len(changes_detected) > 0,
                "changes_detected": changes_detected,
            }
        except Exception as e:
            db.rollback()
            raise e

    @staticmethod
    def fetch_application(jd_id: str, candidate_id: str, db: Session):

        try:
            candidate = db.query(CandidateAccount).options(
                # Use joinedload for single objects (1:1)
                joinedload(CandidateAccount.profile),
                
                
                selectinload(CandidateAccount.education),
                selectinload(CandidateAccount.experience),
                selectinload(CandidateAccount.certificates)
            ).filter(CandidateAccount.id == candidate_id).first()        
            if not candidate:
                raise HTTPException(status_code = status.HTTP_404_NOT_FOUND,details="Candidate not found")
            job_desc = db.query(JobDescription).filter(JobDescription.id == jd_id).first()
            if not job_desc:
                raise HTTPException(status_code = status.HTTP_404_NOT_FOUND,details="Job description not found")
            data = {
                "candidate_id": candidate.id,
                "first_name": candidate.first_name,
                "last_name": candidate.last_name,
                "email": candidate.email,
                "mobile": candidate.mobile,
                "gender": candidate.profile.gender if candidate.profile else None,
                "city": candidate.profile.city if candidate.profile else None,
                "state": candidate.profile.state if candidate.profile else None,
                "permanent_address": candidate.profile.permanent_address if candidate.profile else None,
                "pincode": candidate.profile.pincode if candidate.profile else None,
                "nationality": candidate.profile.nationality if candidate.profile else None,
                "linkedin_url": candidate.profile.linkedin_url if candidate.profile else None,
                "education": [
                    {
                        "highest_qualification": edu.highest_qualification,
                        "degree_name": edu.degree_name,
                        "university": edu.university,
                        "start_month": edu.start_month,
                        "end_month": edu.end_month,
                        "start_year": edu.start_year,
                        "end_year": edu.end_year,
                        "score": edu.score
                    } for edu in (candidate.education or [])
                ],
                "experience": [
                    {
                        "total_experience": exp.total_experience,
                        "relevent_experience": exp.relevent_experience,
                        "current_company": exp.current_company,
                        "current_job_title": exp.current_job_title,
                        "notice_period": exp.notice_period,
                        "current_ctc": exp.current_ctc,
                        "expected_ctc": exp.expected_ctc,
                        "resume_path": exp.resume_path,
                        "location_preference": exp.location_preference,
                        "open_to_relocate": exp.open_to_relocate
                    } for exp in (candidate.experience or [])
                ],
                "certificates": [
                    {
                        "name": cert.name,
                        "provider": cert.provider,
                        "year": cert.year,
                        "certificate_path": cert.certificate_path
                    } for cert in (candidate.certificates or [])
                ]
            }
            return {
                "data":data
            }
        except Exception as e:
            db.rollback()
            raise e
        




    
    