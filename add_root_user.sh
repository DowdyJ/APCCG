#!/bin/bash
echo "Enter Discord user ID (e.g. 1020123456789123456)"
read userId
sqlite3 data/apccg.db <<EOF
INSERT INTO TrustedUsers (
    user_id,
    can_alter_users,
    can_add_commands,
    can_remove_commands,
    can_run_commands,
    can_stop_commands) 
VALUES ('$userId',1,1,1,1,1);
.exit
EOF