import React, { useState } from "react";
import {
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  ButtonBase,
} from "@mui/material";
import { Logout as LogoutIcon } from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";

export const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      handleClose();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  if (!user) return null;

  return (
    <>
      <ButtonBase
        onClick={handleClick}
        sx={{
          borderRadius: "50%",
          "&:hover": {
            transform: "scale(1.05)",
            transition: "transform 0.2s ease-in-out",
          },
        }}
      >
        <Avatar
          src={user.user_metadata?.avatar_url}
          alt={user.user_metadata?.full_name || user.email}
          sx={{
            width: 36,
            height: 36,
            border: "2px solid rgba(255, 255, 255, 0.2)",
            "&:hover": {
              border: "2px solid rgba(255, 255, 255, 0.4)",
            },
          }}
        >
          {(user.user_metadata?.full_name || user.email || "")
            .charAt(0)
            .toUpperCase()}
        </Avatar>
      </ButtonBase>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{
          mt: 1,
        }}
      >
        <MenuItem onClick={handleSignOut}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sign out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
