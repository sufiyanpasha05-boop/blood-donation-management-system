from db import get_db_connection


def create_user(
    role,
    full_name,
    email,
    phone,
    password_hash
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO users
        (role, full_name, email, phone, password_hash)
        VALUES (%s, %s, %s, %s, %s)
    """

    values = (
        role,
        full_name,
        email,
        phone,
        password_hash
    )

    cursor.execute(query, values)
    conn.commit()

    user_id = cursor.lastrowid

    cursor.close()
    conn.close()

    return user_id
def get_user_by_email_or_phone(login):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT
            user_id,
            role,
            full_name,
            email,
            phone,
            password_hash,
            email_verified,
            phone_verified,
            is_active
        FROM users
        WHERE email = %s OR phone = %s
        LIMIT 1
    """

    cursor.execute(query, (login, login))
    user = cursor.fetchone()

    cursor.close()
    conn.close()

    return user