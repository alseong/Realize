import React from "react";
import { Box, Avatar, Typography, IconButton, Tooltip } from "@mui/material";
import { Logout as LogoutIcon } from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";

export const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  if (!user) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: 1,
      }}
    >
      <Avatar
        src={user.user_metadata?.avatar_url}
        alt={user.user_metadata?.full_name || user.email}
        sx={{ width: 32, height: 32 }}
      >
        {(user.user_metadata?.full_name || user.email || "")
          .charAt(0)
          .toUpperCase()}
      </Avatar>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            color: "white",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.user_metadata?.full_name || user.email}
        </Typography>
      </Box>

      <Tooltip title="Sign out">
        <IconButton
          size="small"
          onClick={handleSignOut}
          sx={{
            color: "white",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            },
          }}
        >
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
