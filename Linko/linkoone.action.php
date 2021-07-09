<?php

/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Linkoone implementation : © Geoffrey VOYER <geoffrey.voyer@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on https://boardgamearena.com.
 * See http://en.doc.boardgamearena.com/Studio for more information.
 * -----
 * 
 * linkoone.action.php
 *
 * Linkoone main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *       
 * If you define a method "myAction" here, then you can call it from your javascript code with:
 * this.ajaxcall( "/linkoone/linkoone/myAction.html", ...)
 *
 */


class action_linkoone extends APP_GameAction
{
  // Constructor: please do not modify
  public function __default()
  {
    if (self::isArg('notifwindow')) {
      $this->view = "common_notifwindow";
      $this->viewArgs['table'] = self::getArg("table", AT_posint, true);
    } else {
      $this->view = "linkoone_linkoone";
      self::trace("Complete reinitialization of board game");
    }
  }

  public function play()
  {
    self::setAjaxMode();
    $type_id = self::getArg("type", AT_posint, true);
    $line_id = self::getArg("line", AT_posint, true);
    $position = self::getArg("position", AT_int, true);
    $this->game->play($type_id, $line_id, $position);
    self::ajaxResponse();
  }

  public function draw()
  {
    self::setAjaxMode();
    $this->game->draw();
    self::ajaxResponse();
  }

  public function passDraw()
  {
    self::setAjaxMode();
    $this->game->passDraw();
    self::ajaxResponse();
  }

  public function passFlock()
  {
    self::setAjaxMode();
    $this->game->passFlock();
    self::ajaxResponse();
  }

  public function completeFlock()
  {
    self::setAjaxMode();
    $type_id = self::getArg("type", AT_posint, true);
    $this->game->completeFlock($type_id);
    self::ajaxResponse();
  }
}
