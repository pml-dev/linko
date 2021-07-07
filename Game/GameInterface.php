<?php
namespace linko\Game;
/**
 *
 * @author Mr_Kywar mr_kywar@gmail.com
 */
interface GameInterface {

    public function setupNewGame(array $players, $options = array()): GameInterface;
    
    public function getGameName(): string;
    
    
    
    
    
    //tmp
    public function setupOption($options = array()): GameInterface;
}
