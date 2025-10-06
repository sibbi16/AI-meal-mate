-- create a admin user
INSERT INTO
    auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'admin@decodifi.uk',
        crypt ('mHMGB1uzkdfQ16xU', gen_salt ('bf')),
        current_timestamp,
        current_timestamp,
        current_timestamp,
        '{"provider":"email","providers":["email"]}',
        '{}',
        current_timestamp,
        current_timestamp,
        '',
        '',
        '',
        ''
    )
;

-- test user email identities
INSERT INTO
    auth.identities (
        id,
        user_id,
        identity_data,
        provider_id,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) (
        select
            uuid_generate_v4 (),
            '00000000-0000-0000-0000-000000000000',
            format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb,
            '00000000-0000-0000-0000-000000000000',
            'email',
            current_timestamp,
            current_timestamp,
            current_timestamp
        from
            auth.users
    );

update roles set role = 'admin' where user_id = '00000000-0000-0000-0000-000000000000';

insert into organisations (id, name, slug) values ('00000000-0000-0000-0000-000000000000', 'Kingsbury', 'kingsbury');

