-- Fonction pour récupérer un utilisateur par son adresse de wallet
CREATE OR REPLACE FUNCTION get_user_by_wallet(wallet_addr TEXT)
RETURNS SETOF users
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM users WHERE wallet_address = wallet_addr LIMIT 1;
$$;

-- Fonction pour créer un nouvel utilisateur
CREATE OR REPLACE FUNCTION create_user(wallet_addr TEXT, user_name TEXT, user_email TEXT)
RETURNS SETOF users
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO users (wallet_address, username, email)
  VALUES (wallet_addr, user_name, user_email)
  RETURNING *;
$$;

-- Fonction pour mettre à jour un utilisateur
CREATE OR REPLACE FUNCTION update_user(wallet_addr TEXT, user_name TEXT, user_email TEXT)
RETURNS SETOF users
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE users
  SET 
    username = COALESCE(user_name, username),
    email = COALESCE(user_email, email),
    updated_at = NOW()
  WHERE wallet_address = wallet_addr
  RETURNING *;
$$;
