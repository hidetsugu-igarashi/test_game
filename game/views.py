from django.shortcuts import render


def typing_game(request):
    """Render the main typing game screen."""
    return render(request, 'game/index.html')
