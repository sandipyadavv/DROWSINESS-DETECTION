import re

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect

from .models import User


def clean_phone(value):
    return re.sub(r"[^\d+]", "", value or "")


def login_view(request):
    if request.user.is_authenticated:
        return redirect("camera")
    if request.method == "POST":
        user = authenticate(
            request,
            username=clean_phone(request.POST.get("phone")),
            password=request.POST.get("password", ""),
        )
        if user:
            login(request, user)
            return redirect("camera")
        messages.error(request, "Invalid phone number or password.")
    return render(request, "login.html")


def register_view(request):
    if request.user.is_authenticated:
        return redirect("camera")
    if request.method == "POST":
        phone = clean_phone(request.POST.get("phone"))
        password = request.POST.get("password", "")
        confirm = request.POST.get("confirm", "")
        if len(phone) < 8:
            messages.error(request, "Enter a valid phone number.")
        elif len(password) < 6:
            messages.error(request, "Password must be at least 6 characters.")
        elif password != confirm:
            messages.error(request, "Passwords do not match.")
        elif User.objects.filter(phone=phone).exists():
            messages.error(request, "This phone number is already registered.")
        else:
            user = User.objects.create_user(phone=phone, password=password)
            login(request, user)
            return redirect("camera")
    return render(request, "register.html")


@login_required
def camera_view(request):
    return render(request, "camera.html")


def logout_view(request):
    logout(request)
    return redirect("login")
