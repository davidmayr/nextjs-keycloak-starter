
export async function logout() {
    const response = await fetch("/api/auth/logout", {
        method: "POST",
    });

    if (!response.ok) {
        throw new Error("Failed to logout");
    }

    window.location.reload()
}