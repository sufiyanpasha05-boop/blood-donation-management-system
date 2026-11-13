
from db import get_db_connection
from mysql.connector import IntegrityError



def create_user(
    role, full_name, email, phone, password_hash,
    registration_no, address, latitude, longitude
):
    if role not in ("hospital", "blood_bank"):
        raise ValueError("Invalid registration role")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        for table in ("hospital", "blood_bank"):
            cursor.execute(
                f"SELECT 1 FROM {table} WHERE email = %s OR phone = %s LIMIT 1",
                (email, phone)
            )
            if cursor.fetchone():
                raise ValueError("Email or phone is already registered")

        cursor.execute(
            "SELECT 1 FROM admin WHERE email = %s LIMIT 1",
            (email,)
        )
        if cursor.fetchone():
            raise ValueError("Email is already registered")

        if role == "hospital":
            query = """
                INSERT INTO hospital (
                    name, registration_no, phone, email,
                    address, latitude, longitude,
                    password, verification_status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
        else:
            query = """
                INSERT INTO blood_bank (
                    name, license_no, phone, email,
                    address, latitude, longitude,
                    password, verification_status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """

        values = (
            full_name,
            registration_no,
            phone,
            email,
            address,
            latitude,
            longitude,
            password_hash,
            "Pending"
        )

        assert query.count("%s") == len(values) == 9

        cursor.execute(query, values)
        conn.commit()

        return cursor.lastrowid

    except IntegrityError:
        conn.rollback()
        raise ValueError("Registration conflicts with an existing account")

    except Exception:
        conn.rollback()
        raise


def get_user_by_email_or_phone(login):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                hospital_id AS user_id,
                'hospital' AS role,
                name AS full_name,
                email,
                phone,
                password AS password_hash,
                verification_status
            FROM hospital
            WHERE email = %s OR phone = %s
            LIMIT 1
        """, (login, login))

        user = cursor.fetchone()
        if user:
            return user

        cursor.execute("""
            SELECT
                blood_bank_id AS user_id,
                'blood_bank' AS role,
                name AS full_name,
                email,
                phone,
                password AS password_hash,
                verification_status
            FROM blood_bank
            WHERE email = %s OR phone = %s
            LIMIT 1
        """, (login, login))

        user = cursor.fetchone()
        if user:
            return user

        cursor.execute("""
            SELECT
                admin_id AS user_id,
                'admin' AS role,
                name AS full_name,
                email,
                NULL AS phone,
                password AS password_hash,
                'Verified' AS verification_status
            FROM admin
            WHERE email = %s
            LIMIT 1
        """, (login,))

        return cursor.fetchone()

    finally:
        cursor.close()
        conn.close()